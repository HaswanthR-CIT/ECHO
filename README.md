
# ECHO - Real-Time Messaging Application


Hi, I’m **Haswanth R**, and this is **ECHO**, a real-time messaging application I built to explore modern web development technologies and create a seamless communication platform. ECHO allows users to chat in real-time, create group chats, interact with an AI chatbot, share files, and more. It features a sleek, modern UI with light/dark theme support, JWT-based authentication for security, and a responsive design that works across devices.

I designed ECHO to be both functional and visually appealing, incorporating features like glassmorphism, gradient buttons, and subtle animations to enhance the user experience. Whether you’re chatting one-on-one, collaborating in a group, or talking to the ECHO AI, this app has something for everyone!

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Usage](#usage)
- [Screenshots](#screenshots)
- [Future Enhancements](#future-enhancements)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

## Features

ECHO includes a wide range of features to make messaging fun and efficient:

- **Real-Time Messaging:** Chat instantly with friends or groups using Socket.io for real-time updates.
- **Group Chats:** Create groups, add members, and chat with multiple people at once.
- **AI Chatbot (ECHO AI):** Chat with ECHO AI for automated responses.
- **File Sharing:** Share images in chats with a preview feature.
- **Message Management:** Edit and delete messages, and copy content to your clipboard.
- **Typing Indicators:** See when someone is typing in real-time.
- **Unread Message Notifications:** Badge counts for unread messages in contacts and groups.
- **Toast Notifications:** Receive alerts for new messages, group events, and system messages.
- **Theme Support:** Switch between light and dark themes, with preferences saved in `localStorage`.
- **Responsive Design:** ECHO works on desktops, tablets, and mobile devices.
- **JWT Authentication:** Secure login and signup with JSON Web Tokens.
- **Modern UI/UX:** Incorporates glassmorphism, gradient backgrounds, and subtle animations.

## Tech Stack

### Frontend
- **React.js**
- **React Router**
- **TailwindCSS**
- **Socket.io Client**
- **Axios**
- **React Toastify**
- **Heroicons**

### Backend
- **Node.js**
- **Express.js**
- **MongoDB**
- **Mongoose**
- **Socket.io**
- **JWT (JSON Web Tokens)**
- **Bcrypt**

## Project Structure

```bash
ECHO/
├── client/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── socket.js
│   │   ├── index.css
│   │   ├── App.js
│   │   └── index.js
│   ├── package.json
│   └── tailwind.config.js
├── server/
│   ├── models/
│   ├── routes/
│   ├── socket/
│   ├── server.js
│   ├── .env
│   └── package.json
├── README.md
└── .gitignore
```

## Prerequisites

Ensure you have the following installed:

- **Node.js** (v14 or higher)
- **MongoDB** (local or cloud instance)
- **Git**

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd ECHO
```

### 2. Set Up the Backend

```bash
cd server
npm install
```

Create a `.env` file with the following:

```env
MONGO_URI=mongodb://localhost:27017/echo_db
JWT_SECRET=your_jwt_secret_key
PORT=5000
```

Start the backend server:

```bash
node server.js
```

### 3. Set Up the Frontend

```bash
cd ../client
npm install
npm start
```

## Usage

1. **Access the app**: Go to `http://localhost:3000`.
2. **Sign Up** and **Log In** to start using the messaging features.
3. Explore the **Dashboard**, create groups, chat, and interact with ECHO AI.



## Future Enhancements

- **More File Types**
- **Encryption**
- **User Profiles**
- **Push Notifications**
- **Video/Audio Calls**
- **Docker for Deployment**

## Contributing

1. Fork the repository.
2. Create a new branch.
3. Commit your changes.
4. Open a pull request.

## License

Licensed under the MIT License.

## Contact

Feel free to reach out:

- **Email:** haswanth1305@gmail.com
- **GitHub:** [Haswanth R](https://github.com/HaswanthR-CIT)
