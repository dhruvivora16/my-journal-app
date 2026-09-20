\# My Journal App



A mobile journaling app built with React Native and Expo. Users can write text notes, record and play back voice notes, attach photos or files, and manage everything fully offline via a local SQLite database.



\## Features

\- Create, edit, and delete text notes with title, body, timestamp, and tags

\- Record and play back audio notes

\- Attach images (camera or gallery) and files

\- Fully offline — all data stored locally in SQLite

\- Settings screen with data management (clear all data) and a cloud sync toggle (backend not yet connected)



\## Setup \& Run



1\. Install dependencies:



npm install



2\. Start the Expo dev server:



npx expo start



3\. Scan the QR code with the \*\*Expo Go\*\* app on your phone, or press `a` / `i` in the terminal to launch an Android/iOS emulator.



\## Libraries Used

\- `expo-sqlite` — local database

\- `expo-audio` — audio recording and playback

\- `expo-image-picker` — camera and photo library access

\- `expo-document-picker` — file picking

\- `expo-file-system` (legacy API) — permanent file storage

\- `expo-sharing` — opening/sharing attached files

\- `@react-navigation/native-stack` — screen navigation

\- `react-native-paper`, `@expo/vector-icons` — UI components



\## Screenshots

!\[Home](screenshot1.jpeg) | !\[Edit Note](screenshot2.jpeg) | !\[Note Detail](screenshot3.jpeg) 



\## Technical Report

See `Technical\_Report.pdf` in this repo for database structure, API details, and implementation notes.

