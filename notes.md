# Learning notes

## JWT Pizza code study and debugging

As part of `Deliverable ⓵ Development deployment: JWT Pizza`, start up the application and debug through the code until you understand how it works. During the learning process fill out the following required pieces of information in order to demonstrate that you have successfully completed the deliverable.

| User activity                                       | Frontend component | Backend endpoints | Database SQL |
| --------------------------------------------------- | ------------------ | ----------------- | ------------ |
| View home page                                      |    Home.tsx              | GET /                  |  None            |
| Register new user<br/>(t@jwt.com, pw: test)         |       Register.tsx             | POST /api/auth                  | user, userRole, auth              |
| Login new user<br/>(t@jwt.com, pw: test)            | Login.tsx                   | POST /api/auth                 | user, userRole, auth              |
| Order pizza                                         | Menu.tsx                    | POST /api/order      | dinerOrder, orderItem, menu             |
| Verify pizza                                        |  Payment.tsx                  | POST /api/order/verify                 | dinerOrder, orderItem              |
| View profile page                                   |DinerDashboard.tsx                    | GET api/order                   | dinerOrder, orderItem             |
| View franchise<br/>(as diner)                       | FranchiseDashboard.tsx                   | GET /api/franchise                  | franchise, store, userRole, user             |
| Logout                                              | Logout.tsx                   | DELETE /api/auth                  | auth            |
| View About page                                     |  About.tsx                  |  None                 | none              |
| View History page                                   | History.tsx                   | None                  |  none            |
| Login as franchisee<br/>(f@jwt.com, pw: franchisee) | Login.tsx                   | POST /api/auth                      | user, userRole, auth             |
| View franchise<br/>(as franchisee)                  | FranchiseDashboard.tsx                   | GET /api/franchise                  | franchise, store, userRole, user              |
| Create a store                                      | CreateStore.tsx                   | POST /api/franchise/${franchise.id}/store                  | store             |
| Close a store                                       | CloseStore.tsx                   | DELETE /api/franchise/${franchise.id}/store/${store.id}                  | store            |
| Login as admin<br/>(a@jwt.com, pw: admin)           |Login.tsx                    | POST /api/auth                  | user, userRole, auth             |
| View Admin page                                     | AdminDashboard.tsx                   | GET /api/franchise?page=${page}&limit=${limit}&name=${nameFilter}                  | franchise, store, userRole, user, dinerOrder, orderItem             |
| Create a franchise for t@jwt.com                    | CreateFranchise.tsx                   | POST /api/franchise                  | franchise, userRole, user             |
| Close the franchise for t@jwt.com                   |CloseFranchise.tsx                    | DELETE /api/franchise/${franchise.id}                  | franchise, store, userRole             |
