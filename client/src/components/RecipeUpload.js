import React, { useState } from 'react';
import axios from 'axios';

const RecipeUpload = ({ onIngredientsExtracted, onError }) => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [isExtracting, setIsExtracting] = useState(false);
    const [error, setError] = useState('');
    const [fileName, setFileName] = useState('');

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            // Basic client-side validation for file type (optional, as server validates too)
            const allowedTypes = ['text/plain', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];
            if (!allowedTypes.includes(file.type)) {
                setError('Invalid file type. Please select a .txt, .pdf, .doc, or .docx file.');
                setSelectedFile(null);
                setFileName('');
                if (onError) onError('Invalid file type. Please select a .txt, .pdf, .doc, or .docx file.');
                return;
            }
            setSelectedFile(file);
            setFileName(file.name);
            setError(''); // Clear previous errors
        } else {
            setSelectedFile(null);
            setFileName('');
        }
    };

    const handleExtract = async () => {
        if (!selectedFile) {
            setError('Please select a file first.');
            if (onError) onError('Please select a file first.');
            return;
        }

        const formData = new FormData();
        formData.append('recipeFile', selectedFile);

        setIsExtracting(true);
        setError('');

        try {
            const token = localStorage.getItem('token');
            const config = {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${token}`,
                },
            };
            const response = await axios.post('/api/recipes/upload-extract', formData, config);
            if (response.data && response.data.ingredients) {
                onIngredientsExtracted(response.data.ingredients);
            } else {
                throw new Error('No ingredients found in the response.');
            }
        } catch (err) {
            const message = err.response?.data?.message || err.message || 'Error extracting ingredients.';
            console.error('Extraction error:', message);
            setError(message);
            if (onError) onError(message);
        } finally {
            setIsExtracting(false);
        }
    };

    return (
        <div className="my-4 p-4 border border-gray-300 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-1 text-gray-700">
                Upload Recipe File
                <span className="ml-2 px-2 py-0.5 bg-yellow-200 text-yellow-800 text-xs font-semibold rounded-full align-middle">
                    Beta
                </span>
            </h3>
            <p className="text-sm text-gray-600 mb-3">
                Upload a .txt, .pdf, .doc, or .docx file to automatically extract ingredients. (Beta feature - please review extracted ingredients carefully.)
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3">
                <label className="w-full sm:w-auto mb-2 sm:mb-0 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 cursor-pointer text-center transition duration-150 ease-in-out">
                    {fileName || 'Choose File'}
                    <input
                        type="file"
                        accept=".txt,.pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        onChange={handleFileChange}
                        className="hidden"
                        id="recipeFileInput"
                    />
                </label>
                <button
                    onClick={handleExtract}
                    disabled={!selectedFile || isExtracting}
                    className="w-full sm:w-auto px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-400 transition duration-150 ease-in-out"
                >
                    {isExtracting ? 'Extracting...' : 'Extract Ingredients'}
                </button>
            </div>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>
    );
};

export default RecipeUpload;
