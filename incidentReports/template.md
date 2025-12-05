# Incident: 2025-12-05

## Summary

On **December 5, 2025**, between about **8:00 AM and 2:00 PM**, users could not place orders in the JWT Pizza app. When they tried to pay, they saw the message:

**“Failed to fulfill order at factory.”**

This happened because the **chaos test** I scheduled the day before caused the Pizza Factory service to intentionally fail. The JWT Pizza app depends on that service to complete orders.

My alert for high errors in Grafana OnCall fired, showing that the `/api/order` endpoint was failing.

---

## Detection

I noticed the incident when my **High 5xx Error Rate** alert fired in Grafana OnCall shortly after 8:00 AM. I confirmed the problem by trying to place an order myself and seeing the same failure message.

To improve detection in the future, I could add a simple automated test order that runs every few minutes and alerts if it fails.

---

## Impact

For the duration of the chaos window, **all users** who tried to order pizza were unable to complete payment.  
No orders were fulfilled during this time.

There were no support tickets because this failure was expected as part of the chaos exercise.

---

## Timeline (Local Time)

- **Dec 3, PM** — I scheduled chaos using the Pizza Factory vendor portal.  
- **Dec 4, 8:00 AM** — Chaos window started.  
- **Shortly after 8:00 AM** — Users began seeing “Failed to fulfill order at factory.”  
- **8:00–2:00 PM** — Alerts fired and the app continued showing failures as the chaos test ran.  

---

## Response

When the alert fired, I checked the dashboard, looked at the logs, and tried placing an order myself. Everything pointed to the Pizza Factory service failing.

Since this was a chaos test, I did not need to change any code or restart anything.

---

## Root Cause

The root cause was the **intentional chaos test**.  
During the chaos window, the Pizza Factory service intentionally failed all order fulfillment requests, which caused the JWT Pizza app to show the factory failure error.


---

## Prevention

Even though this was an intentional failure, I can still improve:

- Add a metric and alert specifically for **Pizza Factory failures**, not just general errors.
- Add a playbook section explaining exactly what to check when the app shows “Failed to fulfill order at factory.”
- Add a simple automated test order to detect vendor problems quickly.

---

## Action Items

1. Add vendor-specific failure alert.  
2. Improve dashboard panels for external services.  
3. Add a test-order probe for quicker detection.  
4. Update playbook with steps for diagnosing vendor outages.
