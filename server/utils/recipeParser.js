const mammoth = require('mammoth');
const pdf = require('pdf-parse');
const fs = require('fs').promises;

async function extractTextFromFile(file) {
    if (!file || !file.buffer || !file.mimetype) {
        throw new Error('Invalid file object provided.');
    }

    const { buffer, mimetype } = file;

    if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || mimetype === 'application/msword') { // .docx or .doc
        try {
            const { value } = await mammoth.extractRawText({ buffer });
            return value;
        } catch (error) {
            console.error('Error extracting text from DOCX:', error);
            throw new Error('Could not extract text from DOCX file.');
        }
    } else if (mimetype === 'application/pdf') {
        try {
            const data = await pdf(buffer);
            return data.text;
        } catch (error) {
            console.error('Error extracting text from PDF:', error);
            throw new Error('Could not extract text from PDF file.');
        }
    } else if (mimetype === 'text/plain') {
        return buffer.toString('utf8');
    } else {
        throw new Error(`Unsupported file type: ${mimetype}. Please upload a .txt, .pdf, or .docx file.`);
    }
}

function customIngredientParser(text) {
    if (!text || typeof text !== 'string') {
        return {
            title: '',
            description: '',
            cookingTime: '',
            servings: '',
            ingredients: [],
            instructions: ''
        };
    }

    const lines = text.split(/\r?\n/);
    let title = '';
    let description = '';
    const finalStructuredIngredients = [];

    const ingredientSectionKeywords = ['ingredients', 'materials', 'you will need'];
    const sectionEndKeywords = ['instructions', 'directions', 'method', 'preparation', 'procedure', 'steps', 'notes', 'nutrition'];
    const subheadingKeywords = ['for the', 'marinade', 'for chicken', 'for an? ', 'for ', 'whole spices', 'other ingredients'];
    const instructionalPhrases = ['adjust to taste', 'refer notes', 'optional', 'skip if', 'omit if', 'or more', 'as needed', 'to taste', 'such as', 'about ', 'approximately', 'roughly', 'skinless bone-in or boneless', 'large pieces', 'drumsticks, legs or mix of all', 'crushed', 'use less spicy variety', 'aged rice only', 'chopped fine', 'slit or chopped', 'for heat', 'if you don\'t have any', 'substitute with cumin', 'omit if you don\'t like'];
    const metadataKeywords = ['prep time', 'cook time', 'total time', 'servings', 'author', 'yield', 'makes', 'nutrition facts', 'calories'];


    // Attempt to extract Title - Simplified Approach
    let titleLineIndex = -1;
    for (let i = 0; i < Math.min(lines.length, 5); i++) {
        const potentialLine = lines[i].trim();
        if (potentialLine && potentialLine.length > 3 && potentialLine.length < 100) {
            const lowerLine = potentialLine.toLowerCase();
            if (
                !ingredientSectionKeywords.some(k => lowerLine.startsWith(k)) &&
                !sectionEndKeywords.some(k => lowerLine.startsWith(k)) &&
                !metadataKeywords.some(k => lowerLine.startsWith(k)) &&
                !lowerLine.includes('http:') && !lowerLine.includes('https:') &&
                !lowerLine.includes('©') && !lowerLine.includes('copyright') &&
                !potentialLine.match(/^\d{1,2}\/\d{1,2}\/\d{2,4}/) &&
                 (potentialLine.match(/[a-zA-Z]/g) || []).length > potentialLine.length / 3
            ) {
                title = potentialLine;
                titleLineIndex = i;
                break;
            }
        }
    }

    // Attempt to extract Description
    let descriptionStartIndex = titleLineIndex !== -1 ? titleLineIndex + 1 : 0;
    if (titleLineIndex === -1 && lines.length > 0) { // If no title, start from first line if it's not empty
        if(lines[0].trim() !== "") descriptionStartIndex = 0;
        else if (lines.length > 1 && lines[1].trim() !== "") descriptionStartIndex = 1; // try second if first is blank
    }


    const descriptionLines = [];
    const descriptionStopKeywords = [...ingredientSectionKeywords, ...sectionEndKeywords, ...metadataKeywords];

    for (let i = descriptionStartIndex; i < lines.length; i++) {
        const currentLine = lines[i].trim();
        const lowerCurrentLine = currentLine.toLowerCase();

        if (i === titleLineIndex) continue; // Don't re-parse the title line as description

        if (currentLine === '' && descriptionLines.length > 0) {
            // If we have a few lines and hit a blank, consider it end of description block
            if (descriptionLines.join(' ').length > 50) break; // Break if substantial description already
            else continue; // otherwise, maybe just a paragraph break
        }
        if (descriptionStopKeywords.some(keyword => lowerCurrentLine.startsWith(keyword))) {
            break;
        }
        if (lowerCurrentLine.includes('©') || lowerCurrentLine.includes('copyright')) {
             if (descriptionLines.length === 0) continue; else break;
        }
        if (currentLine.length < 15 && !currentLine.match(/[.!?]$/) && !lowerCurrentLine.match(/[a-z]/) ) { // Very short, no punctuation, no letters
            if (descriptionLines.length === 0) continue; else break;
        }


        if (currentLine) {
            descriptionLines.push(currentLine);
        }
        if (descriptionLines.length >= 5 && currentLine.length < 20) break; // Stop if many short lines, or after 5 lines if last one is short
        if (descriptionLines.length >= 8) break; // Max 8 lines for description
    }
    description = descriptionLines.join('\n').trim();

    let ingredientLoopStartIndex = titleLineIndex !== -1 ? titleLineIndex + 1 : 0; // Default start after title
    if (descriptionLines.length > 0) { // If description was found, start ingredients after description
        ingredientLoopStartIndex = descriptionStartIndex + descriptionLines.length;
        // Skip any blank lines between description and ingredients
        while(ingredientLoopStartIndex < lines.length && lines[ingredientLoopStartIndex].trim() === '') {
            ingredientLoopStartIndex++;
        }
    } else if (titleLineIndex === -1) { // No title, no description, start from beginning
        ingredientLoopStartIndex = 0;
    }


    const commonUnits = {
        'tablespoons': 'tablespoon', 'tablespoon': 'tablespoon', 'tbsp': 'tablespoon', 'tbsps': 'tablespoon', 'tbsp.': 'tablespoon', 'Tbsps': 'tablespoon', 'Tbsp': 'tablespoon',
        'teaspoons': 'teaspoon', 'teaspoon': 'teaspoon', 'tsp': 'teaspoon', 'tsps': 'teaspoon', 'tsp.': 'teaspoon', 'Tsps': 'teaspoon', 'Tsp': 'teaspoon',
        'cups': 'cup', 'cup': 'cup', 'c.': 'cup', 'c': 'cup', 'C': 'cup',
        'pounds': 'pound', 'pound': 'pound', 'lbs': 'pound', 'lb.': 'pound', 'lb': 'pound',
        'ounces': 'ounce', 'ounce': 'ounce', 'oz': 'ounce', 'oz.': 'ounce',
        'grams': 'gram', 'gram': 'gram', 'g': 'gram', 'gr': 'gram',
        'kilograms': 'kilogram', 'kilogram': 'kilogram', 'kg': 'kilogram', 'kgs': 'kilogram',
        'milliliters': 'ml', 'milliliter': 'ml', 'ml': 'ml', 'mL': 'ml',
        'liters': 'liter', 'liter': 'liter', 'l': 'liter', 'L': 'liter',
        'pinch': 'pinch', 'pinches': 'pinch',
        'dash': 'dash', 'dashes': 'dash',
        'cloves': 'clove', 'clove': 'clove',
        'slices': 'slice', 'slice': 'slice',
        'stalks': 'stalk', 'stalk': 'stalk',
        'sprigs': 'sprig', 'sprig': 'sprig',
        'heads': 'head', 'head': 'head',
        'can': 'can', 'cans': 'can',
        'package': 'package', 'packages': 'package', 'pkg': 'package', 'pkgs': 'package',
        'bunch': 'bunch', 'bunches': 'bunch',
        'inch': 'inch', 'inches': 'inch', '"': 'inch',
        '½': '½', '1/2': '½',
        '¼': '¼', '1/4': '¼',
        '¾': '¾', '3/4': '¾',
        '⅓': '⅓', '1/3': '⅓',
        '⅔': '⅔', '2/3': '⅔',
        '\u215B': '⅛', '\u215C': '⅜', '\u215D': '⅝', '\u215E': '⅞',
    };
    const unitKeys = Object.keys(commonUnits).sort((a, b) => b.length - a.length);
    const unicodeFractions = `[\u00BD\u00BC\u00BE\u2153\u2154\u215B\u215C\u215D\u215E]`;
    const simpleFractions = `\\d+\\/\\d+`;
    const mixedFractionsWithUnicode = `\\d+\\s*${unicodeFractions}`;
    const mixedFractionsWithSimple = `\\d+\\s+${simpleFractions}`;
    const decimals = `\\d*\\.\\d+`;
    const wholeNumbers = `\\d+`;
    const singleQuantityPattern = `(?:${mixedFractionsWithUnicode}|${mixedFractionsWithSimple}|${simpleFractions}|${unicodeFractions}|${decimals}|${wholeNumbers})`;
    const rangePattern = `(?:${singleQuantityPattern})\\s*(?:to|-)\\s*(?:${singleQuantityPattern})`;
    const quantityRegexPart = `(?:${rangePattern}|${singleQuantityPattern})`;

    let ingredientsSectionStarted = false;
    for (let i = ingredientLoopStartIndex; i < lines.length; i++) {
        let trimmedLine = lines[i].trim();

        if (i === titleLineIndex && title !== "") continue; // Should not happen if ingredientLoopStartIndex is correct

        if (!ingredientsSectionStarted) {
            if (ingredientSectionKeywords.some(keyword => trimmedLine.toLowerCase().startsWith(keyword))) {
                ingredientsSectionStarted = true;
                const keywordMatch = ingredientSectionKeywords.find(k => trimmedLine.toLowerCase().startsWith(k));
                if (keywordMatch) {
                    const restOfLine = trimmedLine.substring(keywordMatch.length).trim();
                    if (restOfLine.startsWith(':')) {
                        trimmedLine = restOfLine.substring(1).trim();
                    } else {
                        trimmedLine = restOfLine;
                    }
                    if (trimmedLine === '') continue;
                }
            }
            if (!ingredientsSectionStarted) continue;
        }

        if (sectionEndKeywords.some(keyword => trimmedLine.toLowerCase().startsWith(keyword))) {
            break;
        }
        if (trimmedLine === '') continue;

        const lowerTrimmedLine = trimmedLine.toLowerCase();
        let isSubheading = false;
        if (subheadingKeywords.some(shKeyword => lowerTrimmedLine.startsWith(shKeyword)) && trimmedLine.length < 50 && !trimmedLine.match(new RegExp(`^(${quantityRegexPart})`))) {
            isSubheading = true;
        } else if (trimmedLine.length < 35 && !lowerTrimmedLine.match(/[a-z]/) && lowerTrimmedLine.match(/[A-Z]/) && !trimmedLine.match(new RegExp(`^(${quantityRegexPart})`))) {
             isSubheading = true;
        } else if (trimmedLine.length < 35 && trimmedLine.match(/^[A-Z][a-z']+(?:\s[A-Z][a-z']+)*:?$/) && !trimmedLine.match(new RegExp(`^(${quantityRegexPart})`))) {
             isSubheading = true;
        }
        if (isSubheading) continue;

        let quantity = '';
        let unit = '';
        let name = trimmedLine;
        let currentLineRemainder = trimmedLine;

        const quantityMatch = currentLineRemainder.match(new RegExp(`^(${quantityRegexPart})\\s*`, 'i'));
        if (quantityMatch) {
            quantity = quantityMatch[1].trim();
            currentLineRemainder = currentLineRemainder.substring(quantityMatch[0].length).trim();
        }
        name = currentLineRemainder;

        for (const uKey of unitKeys) {
            const unitRegex = new RegExp(`^${uKey}(?:s|es)?(?:\\b|\\.|\\(|,|$)`, 'i');
            if (currentLineRemainder.match(unitRegex)) {
                const matchedUnitText = currentLineRemainder.match(unitRegex)[0];
                unit = commonUnits[uKey];
                name = currentLineRemainder.substring(matchedUnitText.replace(/\.$|\(s\)$|,$/, '').length).trim();
                if (name.startsWith('.') || name.startsWith(',')) {
                    name = name.substring(1).trim();
                }
                break;
            }
        }
        name = name.replace(/^of\s+/i, '').trim();

        let j = i + 1;
        while (j < lines.length) {
            const nextLineTrimmed = lines[j].trim();
            if (nextLineTrimmed === '' || sectionEndKeywords.some(keyword => nextLineTrimmed.toLowerCase().startsWith(keyword)) || subheadingKeywords.some(sh => nextLineTrimmed.toLowerCase().startsWith(sh))) {
                break;
            }
            const nextLineQuantityMatch = nextLineTrimmed.match(new RegExp(`^(${quantityRegexPart})\\s*`, 'i'));
            let nextLineHasOwnUnit = false;
            let tempNextLineName = nextLineQuantityMatch ? nextLineTrimmed.substring(nextLineQuantityMatch[0].length).trim() : nextLineTrimmed;
            for (const uKey of unitKeys) {
                 const unitRegex = new RegExp(`^${uKey}(?:s|es)?(?:\\b|\\.|\\(|,|$)`, 'i');
                if (tempNextLineName.match(unitRegex)) {
                    nextLineHasOwnUnit = true;
                    break;
                }
            }
            if (nextLineQuantityMatch || nextLineHasOwnUnit) break;

            if (nextLineTrimmed.startsWith('(') || instructionalPhrases.some(p => nextLineTrimmed.toLowerCase().includes(p.toLowerCase()))) {
                name += ` ${nextLineTrimmed}`;
                i = j;
                j++;
            } else {
                break;
            }
        }

        for (const phrase of instructionalPhrases) {
            const phrasePattern = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regexParentheses = new RegExp(`\\s*\\(${phrasePattern}(?:[^)]*)?\\)`, 'gi');
            const regexEnd = new RegExp(`(?:\\s+|,\\s*)${phrasePattern}(?:\\s+.*)?$`, 'gi');
            name = name.replace(regexParentheses, '').trim();
            name = name.replace(regexEnd, '').trim();
            if (name.toLowerCase() === phrase) name = "";
        }
        name = name.replace(/,\s*$/, '').trim();

        if (name || quantity || unit) {
            if (name.length < 2 && !quantity && !unit && !commonUnits[name.toLowerCase()]) {
                // Skip
            } else {
                finalStructuredIngredients.push({
                    quantity: quantity,
                    unit: unit,
                    name: name,
                });
            }
        }
    }

    if (finalStructuredIngredients.length === 0 && lines.length > 0 && !title && !description) { // Basic fallback
        lines.forEach(line => {
            const fbTrimmed = line.trim();
            if (fbTrimmed && fbTrimmed.length > 2 && !sectionEndKeywords.some(k => fbTrimmed.toLowerCase().startsWith(k)) && !ingredientSectionKeywords.some(k => fbTrimmed.toLowerCase().startsWith(k)) && !/^\d+\.\s/.test(fbTrimmed)) {
                finalStructuredIngredients.push({ name: fbTrimmed, quantity: '', unit: '' });
            }
        });
    }

    return {
        title: title,
        description: description,
        cookingTime: '',
        servings: '',
        ingredients: finalStructuredIngredients.filter(ing => ing.name && ing.name.trim().length > 0),
        instructions: ''
    };
}

module.exports = {
    extractTextFromFile,
    customIngredientParser,
};
