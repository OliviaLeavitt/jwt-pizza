import React from "react";
import View from "./view";
import { useNavigate } from "react-router-dom";
import NotFound from "./notFound";
import Button from "../components/button";
import { pizzaService } from "../service/service";
import {
  Franchise,
  FranchiseList,
  Role,
  Store,
  User,
} from "../service/pizzaService";
import { TrashIcon } from "../icons";

interface Props {
  user: User | null;
}

type UserList = { users: User[]; more: boolean };

export default function AdminDashboard(props: Props) {
  const navigate = useNavigate();

  // ---------- Franchises
  const [franchiseList, setFranchiseList] = React.useState<FranchiseList>({
    franchises: [],
    more: false,
  });
  const [franchisePage, setFranchisePage] = React.useState(0);
  const filterFranchiseRef = React.useRef<HTMLInputElement>(null);

  // ---------- Users
  const [userList, setUserList] = React.useState<UserList>({
    users: [],
    more: false,
  });
  // keep UI zero-based, convert to 1-based when calling API
  const [userPage, setUserPage] = React.useState(0);
  const filterUserRef = React.useRef<HTMLInputElement>(null);

  // ---------- Normalizers
  function normalizeFranchiseList(data: FranchiseList): FranchiseList {
    return {
      franchises: (data?.franchises ?? []).map((f) => ({
        ...f,
        admins: f.admins ?? [],
        stores: f.stores ?? [],
      })),
      more: !!data?.more,
    };
  }

  function normalizeUserList(data: UserList): UserList {
    return {
      users: (data?.users ?? []).map((u) => ({ ...u, roles: u.roles ?? [] })),
      more: !!data?.more,
    };
  }

  // ---------- Users: load whenever page or admin changes
  const loadUsers = React.useCallback(async () => {
    if (!Role.isRole(props.user, Role.Admin)) return;
    const raw = filterUserRef.current?.value?.trim();
    const name = raw ? `*${raw}*` : "*";
    const resp = await pizzaService.getUsers(userPage, 10, name);
    setUserList(normalizeUserList(resp));
  }, [props.user, userPage]);

  React.useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  async function filterUsers() {
    setUserPage(0);
    await loadUsers();
  }

  async function deleteUser(u: User) {
    const id = Number(u.id); // fix TS: ensure numeric id
    if (!Number.isFinite(id)) return;
    if (!confirm(`Delete ${u.name}?`)) return;

    await pizzaService.deleteUser(id);

    // refresh; if page becomes empty, step back one page
    await loadUsers();
    if (userList.users.length === 1 && userPage > 0) {
      setUserPage((p) => Math.max(0, p - 1));
      // queue a reload after setState
      setTimeout(() => loadUsers(), 0);
    }
  }

  // ---------- Franchises: load whenever page or user changes
  React.useEffect(() => {
    (async () => {
      const data = await pizzaService.getFranchises(franchisePage, 3, "*");
      setFranchiseList(normalizeFranchiseList(data));
    })();
  }, [props.user, franchisePage]);

  function createFranchise() {
    navigate("/admin-dashboard/create-franchise");
  }

  function closeFranchise(franchise: Franchise) {
    navigate("/admin-dashboard/close-franchise", {
      state: { franchise },
    });
  }

  function closeStore(franchise: Franchise, store: Store) {
    navigate("/admin-dashboard/close-store", {
      state: { franchise, store },
    });
  }

  async function filterFranchises() {
    const data = await pizzaService.getFranchises(
      franchisePage,
      10,
      `*${filterFranchiseRef.current?.value ?? ""}*`
    );
    setFranchiseList(normalizeFranchiseList(data));
  }

  let response = <NotFound />;
  if (Role.isRole(props.user, Role.Admin)) {
    response = (
      <View title="Mama Ricci's kitchen">
        {/* Franchises */}
        <div className="text-start py-8 px-4 sm:px-6 lg:px-8">
          <h3 className="text-neutral-100 text-xl">Franchises</h3>
          <div className="bg-neutral-100 overflow-clip my-4">
            <div className="flex flex-col">
              <div className="-m-1.5 overflow-x-auto">
                <div className="p-1.5 min-w-full inline-block align-middle">
                  <div className="overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="uppercase text-neutral-100 bg-slate-400 border-b-2 border-gray-500">
                        <tr>
                          {["Franchise", "Franchisee", "Store", "Revenue", "Action"].map(
                            (header) => (
                              <th
                                key={header}
                                scope="col"
                                className="px-6 py-3 text-center text-xs font-medium"
                              >
                                {header}
                              </th>
                            )
                          )}
                        </tr>
                      </thead>

                      {franchiseList.franchises.map((franchise, findex) => {
                        return (
                          <tbody key={findex} className="divide-y divide-gray-200">
                            <tr className="border-neutral-500 border-t-2">
                              <td className="text-start px-2 whitespace-nowrap text-l font-mono text-orange-600">
                                {franchise.name}
                              </td>
                              <td
                                className="text-start px-2 whitespace-nowrap text-sm font-normal text-gray-800"
                                colSpan={3}
                              >
                                {(franchise.admins ?? [])
                                  .map((o) => o.name)
                                  .join(", ")}
                              </td>
                              <td className="px-6 py-1 whitespace-nowrap text-end text-sm font-medium">
                                <button
                                  type="button"
                                  className="px-2 py-1 inline-flex items-center gap-x-2 text-sm font-semibold rounded-lg border border-1 border-orange-400 text-orange-400  hover:border-orange-800 hover:text-orange-800"
                                  onClick={() => closeFranchise(franchise)}
                                >
                                  <TrashIcon />
                                  Close
                                </button>
                              </td>
                            </tr>

                            {(franchise.stores ?? []).map((store, sindex) => {
                              return (
                                <tr key={sindex} className="bg-neutral-100">
                                  <td
                                    className="text-end px-2 whitespace-nowrap text-sm text-gray-800"
                                    colSpan={3}
                                  >
                                    {store.name}
                                  </td>
                                  <td className="text-end px-2 whitespace-nowrap text-sm text-gray-800">
                                    {store.totalRevenue?.toLocaleString()} ₿
                                  </td>
                                  <td className="px-6 py-1 whitespace-nowrap text-end text-sm font-medium">
                                    <button
                                      type="button"
                                      className="px-2 py-1 inline-flex items-center gap-x-2 text-sm font-semibold rounded-lg border border-1 border-orange-400 text-orange-400 hover:border-orange-800 hover:text-orange-800"
                                      onClick={() => closeStore(franchise, store)}
                                    >
                                      <TrashIcon />
                                      Close
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        );
                      })}

                      <tfoot>
                        <tr>
                          <td className="px-1 py-1">
                            <input
                              type="text"
                              ref={filterFranchiseRef}
                              name="filterFranchise"
                              placeholder="Filter franchises"
                              className="px-2 py-1 text-sm border border-gray-300 rounded-lg"
                            />
                            <button
                              type="submit"
                              className="ml-2 px-2 py-1 text-sm font-semibold rounded-lg border border-orange-400 text-orange-400 hover:border-orange-800 hover:text-orange-800"
                              onClick={filterFranchises}
                            >
                              Submit
                            </button>
                          </td>
                          <td colSpan={4} className="text-end text-sm font-medium">
                            <button
                              className="w-12 p-1 text-sm font-semibold rounded-lg border border-transparent bg-white text-grey border-grey m-1 hover:bg-orange-200 disabled:bg-neutral-300 "
                              onClick={() => setFranchisePage((p) => Math.max(0, p - 1))}
                              disabled={franchisePage <= 0}
                            >
                              «
                            </button>
                            <button
                              className="w-12 p-1 text-sm font-semibold rounded-lg border border-transparent bg-white text-grey border-grey m-1 hover:bg-orange-200 disabled:bg-neutral-300"
                              onClick={() => setFranchisePage((p) => p + 1)}
                              disabled={!franchiseList.more}
                            >
                              »
                            </button>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Users */}
        <div className="text-start py-8 px-4 sm:px-6 lg:px-8">
          <h3 className="text-neutral-100 text-xl">Users</h3>
          <div className="bg-neutral-100 overflow-clip my-4">
            <div className="flex flex-col">
              <div className="-m-1.5 overflow-x-auto">
                <div className="p-1.5 min-w-full inline-block align-middle">
                  <div className="overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="uppercase text-neutral-100 bg-slate-400 border-b-2 border-gray-500">
                        <tr>
                          {["Name", "Email", "Role", "Action"].map((header) => (
                            <th
                              key={header}
                              scope="col"
                              className="px-6 py-3 text-center text-xs font-medium"
                            >
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-gray-200">
                        {userList.users.map((u) => (
                          <tr key={u.id} className="bg-neutral-100">
                            <td className="text-start px-2 whitespace-nowrap text-sm text-gray-800">
                              {u.name}
                            </td>
                            <td className="text-start px-2 whitespace-nowrap text-sm text-gray-800">
                              {u.email}
                            </td>
                            <td className="text-center px-2 whitespace-nowrap text-sm text-gray-800">
                              {(u.roles ?? []).map((r) => r.role).join(", ")}
                            </td>
                            <td className="px-6 py-1 whitespace-nowrap text-end text-sm font-medium">
                              <button
                                type="button"
                                className="px-2 py-1 inline-flex items-center gap-x-2 text-sm font-semibold rounded-lg border border-1 border-orange-400 text-orange-400  hover:border-orange-800 hover:text-orange-800"
                                onClick={() => deleteUser(u)}
                                aria-label={`Delete ${u.email}`}
                              >
                                <TrashIcon />
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                        {userList.users.length === 0 && (
                          <tr>
                            <td
                              colSpan={4}
                              className="text-center text-sm text-gray-500 py-6"
                            >
                              No users found
                            </td>
                          </tr>
                        )}
                      </tbody>

                      <tfoot>
                        <tr>
                          <td className="px-1 py-1">
                            <input
                              type="text"
                              ref={filterUserRef}
                              placeholder="Filter users"
                              className="px-2 py-1 text-sm border border-gray-300 rounded-lg"
                            />
                            <button
                              type="button"
                              className="ml-2 px-2 py-1 text-sm font-semibold rounded-lg border border-orange-400 text-orange-400 hover:border-orange-800 hover:text-orange-800"
                              onClick={filterUsers}
                            >
                              Apply
                            </button>
                          </td>
                          <td colSpan={3} className="text-end text-sm font-medium">
                            <button
                              className="w-12 p-1 text-sm font-semibold rounded-lg border border-transparent bg-white text-grey border-grey m-1 hover:bg-orange-200 disabled:bg-neutral-300"
                              onClick={() => setUserPage((p) => Math.max(0, p - 1))}
                              disabled={userPage <= 0}
                            >
                              «
                            </button>
                            <button
                              className="w-12 p-1 text-sm font-semibold rounded-lg border border-transparent bg-white text-grey border-grey m-1 hover:bg-orange-200 disabled:bg-neutral-300"
                              onClick={() => setUserPage((p) => p + 1)}
                              disabled={!userList.more}
                            >
                              »
                            </button>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <Button
            className="w-36 text-xs sm:text-sm sm:w-64"
            title="Add Franchise"
            onPress={createFranchise}
          />
        </div>
      </View>
    );
  }

  return response;
}
