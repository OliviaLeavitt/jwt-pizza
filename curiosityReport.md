## How JWT Token Refresh and Rotation Works
### Overview
Keeping users safely logged in is a incredibly important and challenging task. Apps need a way for users to stay logged in without having to enter their password constantly, but they also need to protect accounts if a token is stolen or used by someone else. Because of this, real systems use two different types of tokens. These tokens include a short-lived access token and a longer-lived refresh token. 
While learning about this, I found a security method called refresh token rotation. This means that every time a refresh token is used to get a new access token, the server creates a new refresh token and makes the old one invalid. This prevents attackers from reusing stolen tokens and gives the server better control of user sessions. In this curiosity report, I plan on explaining what a refresh token is,
how rotation works, and why many real world authentication systems use this approach.

