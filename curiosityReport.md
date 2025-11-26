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

### Refresh Token Reuse Detection
There is also another helpful idea known as Reuse Detections
This happens when: 
- A refresh token was already used and rotated.
- Someone tries to use that same (old) token again.
This normally means:
- the refresh token was stolen
- or two devices tried to use the same token
Identity providers like Auth0 and Descope handle this by:
- blocking the reused token
- sometimes blocking all tokens in the token family
- requiring the user to log in again
A replay attack is when someone steals a valid token and tries to use it again to act as the real user. Refresh token rotation helps stop this because once a refresh token is used, it becomes invalid, so a stolen copy no longer works.

### Experiment: Building and Testing Refresh Token Rotation
To see how refresh token rotation works in practice, I built a small Node.js project that includes login, a protected route, a refresh endpoint, and logout. The full code is here:
https://github.com/OliviaLeavitt/refresh-token-rotation-demo

To keep the project simple, I used a small in-memory map to store the user’s current refresh token ID. This let me test refresh token rotation without needing a database.

**What I Tested:**

1. Login – I received an access token and a refresh token.
2. Refresh – Using the refresh token gave me a new access token and a new refresh token, and the old refresh token became invalid.
3. Replay Attack – I tried using the old refresh token again and the server rejected it with an “invalid or reused refresh token” error.
4. Using the New Access Token – The new access token worked to access the protected route.
5. Logout – Logging out removed the valid refresh token, so refreshing again after logout failed.
<img width="1920" height="1080" alt="Screenshot (190)" src="https://github.com/user-attachments/assets/05b90d96-3085-48c5-b039-9b6a77c70fe5" />

**What I Learned**

**This experiment helped me clearly see how:**
- Refresh tokens keep users logged in without asking for passwords again
- Rotation makes each refresh token single-use
- Reusing an old refresh token is blocked (replay protection)
- Logout actually invalidates the session on the server

### Conclusion
Learning about refresh tokens and rotation helped me understand how real authentication systems keep users logged in while staying secure. I saw why short-lived access tokens need support, how refresh tokens safely extend a session, and how rotation stops stolen tokens from being reused. Building a small project and testing replay attacks made the concepts much clearer. Overall, this was a useful deep dive into a real DevOps/QA security technique that modern identity providers rely on.

### References
https://codesignal.com/learn/courses/jwt-security-attacks-defenses-1/lessons/refresh-tokens-and-secure-token-rotation
https://www.descope.com/blog/post/refresh-token-rotation
https://auth0.com/blog/refresh-tokens-what-are-they-and-when-to-use-them/

