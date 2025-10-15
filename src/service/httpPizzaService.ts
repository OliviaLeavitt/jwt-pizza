import {
  PizzaService,
  Franchise,
  FranchiseList,
  Store,
  OrderHistory,
  User,
  Menu,
  Order,
  Endpoints,
  OrderResponse,
  JWTPayload,
} from "./pizzaService";

const pizzaServiceUrl = import.meta.env.VITE_PIZZA_SERVICE_URL;
const pizzaFactoryUrl = import.meta.env.VITE_PIZZA_FACTORY_URL;

class HttpPizzaService implements PizzaService {
  private async callEndpoint<T = any>(
    path: string,
    method = "GET",
    body?: any
  ): Promise<T> {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const authToken = localStorage.getItem("token");
      if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

      if (!path.startsWith("http")) {
        path = pizzaServiceUrl + path;
      }

      const res = await fetch(path, {
        method,
        headers,
        credentials: "include",
        body: body ? JSON.stringify(body) : undefined,
      });

      // Some endpoints (e.g., DELETE 204) return no body
      if (res.status === 204) return {} as T;

      const text = await res.text();
      const json = text ? JSON.parse(text) : {};

      if (!res.ok) {
        const msg = (json && json.message) || `HTTP ${res.status}`;
        throw new Error(msg);
      }

      return json as T;
    } catch (e: any) {
      throw new Error(e?.message ?? "Network error");
    }
  }

  // ---- Users
  async getUsers(pageZeroBased: number, limit: number, name: string) {
    // API expects 1-based page index
    const page = (pageZeroBased ?? 0) + 1;
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit ?? 10),
      name: name || "*",
    });
    return this.callEndpoint<{ users: User[]; more: boolean }>(
      `/api/user?${params.toString()}`,
      "GET"
    );
  }

  async deleteUser(userId: number): Promise<void> {
    await this.callEndpoint(`/api/user/${userId}`, "DELETE");
  }

  async updateUser(updatedUser: User): Promise<User> {
    const { user, token } = await this.callEndpoint(
      `/api/user/${updatedUser.id}`,
      "PUT",
      updatedUser
    );
    localStorage.setItem("token", token);
    return user;
  }

  // ---- Auth
  async login(email: string, password: string): Promise<User> {
    const { user, token } = await this.callEndpoint("/api/auth", "PUT", {
      email,
      password,
    });
    localStorage.setItem("token", token);
    return user;
  }

  async register(name: string, email: string, password: string): Promise<User> {
    const { user, token } = await this.callEndpoint("/api/auth", "POST", {
      name,
      email,
      password,
    });
    localStorage.setItem("token", token);
    return user;
  }

  logout(): void {
    this.callEndpoint("/api/auth", "DELETE").catch(() => {});
    localStorage.removeItem("token");
  }

  async getUser(): Promise<User | null> {
    if (!localStorage.getItem("token")) return null;
    try {
      return await this.callEndpoint("/api/user/me");
    } catch {
      localStorage.removeItem("token");
      return null;
    }
  }

  // ---- Orders/Menu
  async getMenu(): Promise<Menu> {
    return this.callEndpoint("/api/order/menu");
  }

  async getOrders(_user: User): Promise<OrderHistory> {
    return this.callEndpoint("/api/order");
  }

  async order(order: Order): Promise<OrderResponse> {
    return this.callEndpoint("/api/order", "POST", order);
  }

  async verifyOrder(jwt: string): Promise<JWTPayload> {
    return this.callEndpoint(pizzaFactoryUrl + "/api/order/verify", "POST", {
      jwt,
    });
  }

  // ---- Franchise
  async getFranchise(user: User): Promise<Franchise[]> {
    return this.callEndpoint(`/api/franchise/${user.id}`);
  }

  async createFranchise(franchise: Franchise): Promise<Franchise> {
    return this.callEndpoint("/api/franchise", "POST", franchise);
  }

  async getFranchises(
    page = 0,
    limit = 10,
    nameFilter = "*"
  ): Promise<FranchiseList> {
    return this.callEndpoint(
      `/api/franchise?page=${page}&limit=${limit}&name=${nameFilter}`
    );
  }

  async closeFranchise(franchise: Franchise): Promise<void> {
    await this.callEndpoint(`/api/franchise/${franchise.id}`, "DELETE");
  }

  async createStore(franchise: Franchise, store: Store): Promise<Store> {
    return this.callEndpoint(
      `/api/franchise/${franchise.id}/store`,
      "POST",
      store
    );
  }

  async closeStore(franchise: Franchise, store: Store): Promise<null> {
    return this.callEndpoint(
      `/api/franchise/${franchise.id}/store/${store.id}`,
      "DELETE"
    );
  }

  // ---- Docs
  async docs(docType: string): Promise<Endpoints> {
    if (docType === "factory") {
      return this.callEndpoint(pizzaFactoryUrl + `/api/docs`);
    }
    return this.callEndpoint(`/api/docs`);
  }
}

const httpPizzaService = new HttpPizzaService();
export default httpPizzaService;
