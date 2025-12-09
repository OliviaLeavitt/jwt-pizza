# Penetration Testing Report — JWT Pizza  

**Participants:**  
- **Nicholas Samson**  
- **Olivia Leavitt**  

---

## Self Attacks

### Self Attack: Nicholas Samson  
| Item | Result |
| ---- | ------ |
| Date | December 8, 2025 |
| Target | pizza-service.doddlebopper.click |
| Classification | Injection |
| Severity | 2 |
| Images | Image not useful |
| Description | Attempted SQL injection on the update user endpoint to escalate authorization to admin. SQL queries were parameterized so the attack failed. Also attempted default credential login and API key extraction but was unsuccessful. |
| Corrections | None — no vulnerability found. |

---

### Self Attack: Olivia Leavitt  
| Item | Result |
| ---- | ------ |
| Date | December 8, 2025 |
| Target | pizza-service.doddlebopper.click |
| Classification | Weak Login Protection |
| Severity | 1 |
| Images | None |
| Description | Repeated login attempts with incorrect passwords were allowed without delay or blocking. This means attackers could potentially brute‑force passwords over time. |
| Corrections | Add rate‑limiting or account lockout after repeated failed logins. |

---

## Peer Attacks

### Peer Attack: Nicholas Samson → Olivia  
| Item | Result |
| ---- | ------ |
| Date | December 8, 2025 |
| Target | pizza-service.olivialeavitt.click |
| Classification | Injection |
| Severity | 2 (if successful) |
| Description | Tried batching random auth_token values. Most requests were invalid, but one null value returned 200, allowing access to past purchases and login as a user. |
| Corrections | Add stricter auth_token validation and handling for edge cases. |

---

### Peer Attack: Olivia Leavitt → Nicholas  
| Item | Result |
| ---- | ------ |
| Date | December 8, 2025 |
| Target | pizza-service.doddlebopper.click |
| Classification | Broken Input Validation |
| Severity | 2 (successful) |
| Description | Created a user account using only whitespace for name, email, and password. The server accepted the input and returned a valid JWT token, meaning required fields were not actually validated. |
| Corrections | Enforce input rules — no whitespace‑only fields, require valid email format & strong passwords. |

---

## Summary of Learnings

- Input validation must be strict — whitespace and malformed values should never produce accounts or tokens.  
- Parameterized queries protect against SQL injection well.  
- Missing rate‑limits on login opens the door to brute‑force attacks.  
- Token handling needs edge‑case protection to prevent accidental authorization.

---

