# Yug Adlakha MCQ Jungle — v2 Cloud

Firebase integration:
- Email/password signup and login
- Forgot password
- Logout
- Cloud student profile
- Cloud sync for attempts, certificates, bookmarks, wrong-answer notebook and active test
- Progress available across devices
- Existing smart search, all CMA Final tests, custom timer and Admin retained

Firebase project: `mcq-jungle`

Important:
- Email/Password Authentication must remain enabled.
- Firestore rules must allow each authenticated user to access only `/users/{uid}` and its subcollections.
