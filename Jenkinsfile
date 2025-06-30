pipeline {
    agent any
    parameters {
        string(name: 'DOCKER_REGISTRY_URL', defaultValue: '', description: 'Docker registry URL')
        string(name: 'DOCKER_USERNAME', defaultValue: '', description: 'Docker registry username')
        string(name: 'DOCKER_PASSWORD', defaultValue: '', description: 'Docker registry password', password: true)
    }
    stages {
        stage('Checkout') {
            steps {
                git url: 'https://github.com/inventvenkat/food/', branch: 'main'
            }
        }
        stage('Build Client') {
            steps {
                sh 'docker build -t client:${BUILD_NUMBER} -f client/Dockerfile .'
            }
        }
        stage('Build Server') {
            steps {
                sh 'docker build -t server:${BUILD_NUMBER} -f server/Dockerfile .'
            }
        }
        stage('Tag Images') {
            steps {
                sh "docker tag client:\${BUILD_NUMBER} \${DOCKER_REGISTRY_URL}/client:\${BUILD_NUMBER}"
                sh "docker tag server:\${BUILD_NUMBER} \${DOCKER_REGISTRY_URL}/server:\${BUILD_NUMBER}"
            }
        }
        stage('Push Images') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'dockerhub-id', usernameVariable: 'DOCKER_USERNAME', passwordVariable: 'DOCKER_PASSWORD')]) {
                    sh "docker login -u \${DOCKER_USERNAME} -p \${DOCKER_PASSWORD} \${DOCKER_REGISTRY_URL}"
                    sh "docker push \${DOCKER_REGISTRY_URL}/client:\${BUILD_NUMBER}"
                    sh "docker push \${DOCKER_REGISTRY_URL}/server:\${BUILD_NUMBER}"
                }
            }
        }
    }
}
