# 🌍 WanderLust

A full-stack property listing web application where users can discover, create, review, and manage travel accommodations. Built with Node.js, Express, MongoDB Atlas, and EJS, with image uploads powered by Cloudinary and secure authentication using Passport.

🔗 **Live Demo:** [https://wanderlust-qckl.onrender.com](https://wanderlust-qckl.onrender.com)

---

## ✨ Features

* 🔐 User authentication & authorization (Passport.js)
* 🔒 Secure password hashing & session management (connect-mongo)
* 🏠 Create, edit, delete property listings (CRUD)
* 🖼️ Image uploads with Cloudinary
* ⭐ Reviews & ratings system
* 🔍 Search listings by title or country
* 🗂️ Category-based filtering
* 🧭 Location geocoding with map coordinates
* ⚙️ RESTful API architecture
* 🧱 Middleware-based validation & protection
* ❗ Centralized error handling

---

## 🛠️ Tech Stack

**Backend**

* Node.js
* Express.js
* MongoDB Atlas
* Mongoose

**Frontend**

* EJS
* Bootstrap 5

**Authentication & Security**

* Passport.js
* express-session
* connect-mongo

**File Storage**

* Cloudinary
* Multer

**Deployment**

* Render

---

## 🚀 Getting Started (Local Setup)

### 1. Clone the repository

```bash
git clone https://github.com/your-username/wanderlust.git
cd wanderlust
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create a `.env` file

```env
ATLAS_DB_URL=your_mongodb_atlas_url
SESSION_SECRET=your_session_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_KEY=your_cloudinary_key
CLOUDINARY_SECRET=your_cloudinary_secret
NODE_ENV=development
```

### 4. Run the application

```bash
nodemon app.js
```

Open your browser at:

```
http://localhost:8080
```

---

## 🌐 Environment Variables (Production)

These must be configured on your hosting platform (Render):

* `ATLAS_DB_URL`
* `SESSION_SECRET`
* `CLOUDINARY_CLOUD_NAME`
* `CLOUDINARY_KEY`
* `CLOUDINARY_SECRET`
* `NODE_ENV=production`

---

## 📁 Project Structure (Simplified)

```
PROJECT/
│── app.js
│── models/
│── routes/
│── controllers/
│── views/
│── public/
│── utils/
│── .env (ignored)
│── package.json
```

---

## 🧪 Key Learnings

* Building RESTful APIs with Express
* Session persistence using MongoDB
* Secure authentication & authorization
* Cloud image storage integration
* Production deployment & environment configuration
* Debugging real-world backend issues

---

## 📸 Screenshots

*Add screenshots here (Home, Login, Create Listing, Listing Details, Reviews)*

---

## 📜 License

This project is for educational and portfolio purposes.

---

## 🙌 Acknowledgements

Inspired by modern accommodation platforms and built as a full-stack learning project.

---

If you like this project, feel free to ⭐ the repository!
