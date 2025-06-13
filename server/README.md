# Recipe App Server

## Prerequisites

Before you begin, ensure you have Node.js and npm installed on your system.

## Database Setup (MongoDB)

This project uses MongoDB as its database.

### 1. Install MongoDB

You need to have MongoDB installed and running on your system.
- **Linux:** [MongoDB Linux Installation Guide](https://www.mongodb.com/docs/manual/administration/install-on-linux/)
- **macOS:** [MongoDB macOS Installation Guide](https://www.mongodb.com/docs/manual/tutorial/install-mongodb-on-os-x/)
- **Windows:** [MongoDB Windows Installation Guide](https://www.mongodb.com/docs/manual/tutorial/install-mongodb-on-windows/)

Ensure the MongoDB service is started after installation.

### 2. Environment Configuration

The server requires a `.env` file in the `recipe-app/server/` directory for configuration. Create this file if it doesn't exist and add the following variables:

```env
MONGODB_URI=mongodb://localhost:27017/recipe_app_db
JWT_SECRET=yourSuperSecretKeyForJWTs
```

-   `MONGODB_URI`: The connection string for your MongoDB instance.
    -   If MongoDB is running locally on the default port, `mongodb://localhost:27017/recipe_app_db` should work.
    -   Replace `recipe_app_db` if you prefer a different database name.
    -   Adjust the host and port if your MongoDB instance is not local or uses a different port.
-   `JWT_SECRET`: A strong, unique secret key for signing JSON Web Tokens. **Replace `yourSuperSecretKeyForJWTs` with a secure, randomly generated string.**

### 3. Database and Collection Creation

Mongoose (the ODM used in this project) will automatically create the `recipe_app_db` database (or the name you specified in `MONGODB_URI`) and the necessary collections (`users`, `recipes`, `mealplans`, `recipecollections`) with their defined schemas and indexes when the server successfully connects to MongoDB for the first time. You do not need to manually create them.

## Getting Started

1.  **Clone the repository (if you haven't already):**
    ```bash
    git clone <your-repository-url>
    cd recipe-app/server
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Start the server:**
    ```bash
    npm start
    ```
    The server will typically run on `http://localhost:PORT` (the port is usually defined in your server's startup script, often 5000 or 3001 if not specified).
