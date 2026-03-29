# 🎯 Focus-Flow

> A modern, real-time educational platform designed to provide a "Cognitive Sanctuary" for students and a powerful analytics engine for teachers.

## 🚀 Features

*   **🎓 Dual Dashboard System:** Dedicated, customized interfaces for both Students and Teachers.
*   **📝 Advanced Test Builder:** Robust tools for teachers to create, edit, and publish custom assessments.
*   **👥 Multi-Student Assessment:** Assign tests to specific groups of students with strict access control.
*   **📊 Real-Time Analytics:** Live dashboard for teachers to monitor student engagement, test submissions, and concept-based performance metrics.
*   **🔒 Secure Sandbox:** Students only see published tests they are authorized to take, ensuring data privacy and correct test execution.
*   **✨ Cognitive Sanctuary Design:** A minimal, focused UI built to reduce cognitive load and enhance concentration, using thoughtfully crafted color palettes and typography.
*   **⚡ Real-Time Synchronization:** Seamless updates powered by Firebase, instantly reflecting new tests and submissions without needing to refresh.

## 🛠️ Tech Stack

*   **Frontend:** React, Next.js, TailwindCSS
*   **Backend / Database:** Firebase (Firestore, Authentication, Security Rules)
*   **Architecture:** Map-based data structures for optimized NoSQL querying and state management.

## 📁 Project Structure

```text
Focus-Flow/
├── frontend/          # Next.js React application (UI, Components, Pages)
├── backend/           # Server-side utilities, Cloud Functions, or Firebase config
└── README.md          # Project documentation
```

## 📦 Installation

To get the project up and running on your local machine, follow these steps:

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/focus-flow.git
    cd focus-flow
    ```

2.  **Install Frontend Dependencies:**
    ```bash
    cd frontend
    npm install
    # or yarn install / pnpm install
    ```

3.  **Install Backend Dependencies (if applicable):**
    ```bash
    cd ../backend
    npm install
    ```

## 🔐 Environment Variables

You will need to set up Firebase environment variables to connect to your database. Create a `.env.local` file in the `frontend` directory:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

## ▶️ Usage

1.  **Start the development server:**
    ```bash
    cd frontend
    npm run dev
    ```

2.  Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
3.  Choose either the "Student" or "Teacher" login path to explore the respective functionalities.

## 📸 Screenshots

*(Replace these placeholders with actual screenshots of your application)*

| Teacher Dashboard | Student Dashboard | Test Builder |
| :---: | :---: | :---: |
| [Teacher Dashboard](https://github.com/Adithyadprabhu/Focus-Flow/blob/main/images/Screenshot%202026-03-29%20152456.png)| [Student Dashboard](https://via.placeholder.com/400x250.png?text=Student+Dashboard) | [Test Builder](https://github.com/Adithyadprabhu/Focus-Flow/blob/main/images/Screenshot%202026-03-29%20152724.png?raw=true)|

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1.  Fork the project
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
