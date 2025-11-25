## How JWT Token Refresh and Rotation Works

### Overview
Keeping users safely logged in is an incredibly important and challenging task. Apps need a way for users to stay logged in without having to enter their password constantly, but they also need to protect accounts if a token is stolen or used by someone else. Because of this, real systems use two different types of tokens: a short-lived **access token** and a longer-lived **refresh token**.

While learning about this, I found a security method called **refresh token rotation**. This means that every time a refresh token is used to get a new access token, the server creates a new refresh token and invalidates the old one. This prevents attackers from reusing stolen tokens and gives the server better control of user sessions.

In this curiosity report, I plan on explaining what a refresh token is, how rotation works, and why many real-world authentication systems use this approach.

### What Are Access Tokens and Refresh Tokens?

Most authentication systems use two tokens instead of one:

#### **Access Token**
This is the token the app uses constantly when making API requests.

- Short-lived (minutes)
- Sent with every request to prove who the user is
- Once it expires, the user can no longer make authenticated API calls

#### **Refresh Token**
The refresh token lives much longer and is used much less often.
- It is long-lived (days or weeks)
- It is not sent with normal API requests
- It is only used to ask the server for a new access token when the old one expires

It is like a backup token the system can use behind the scenes

### Why Two Tokens?

Using two tokens fixes two big problems:

1. Better Security: Access tokens expire quickly, which limits the damage if someone steals one.

2. Better User Experience: Because refresh tokens last much longer, the app can get new access tokens without making the user log in again.

### What Is Refresh Token Rotation?
A refresh token is powerful. If someone steals it, they could continuously request new access tokens. To avoid this, real authentication providers use something called refresh token rotation.
#### How it works:
1. The user has a refresh token.
2. They send it to the /refresh endpoint.
3. The server:
    - creates a new access token
    - creates a new refresh token
    - invalidates the old refresh token
4. The user must use the new refresh token next time.
Why is this safer?
If a hacker steals a refresh token:
- The real user uses the token first → gets a new one
- The attacker tries to use the old one → server rejects it
- The attack fails
This reduces the usefulness of stolen tokens.

