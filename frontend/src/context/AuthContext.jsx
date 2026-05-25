import { createContext, useContext, useEffect, useState } from "react";
import API from "../api/api";

const AuthContext = createContext(null);

const normalizeUser = (rawUser = {}) => {
  const center = rawUser.center || null;

  return {
    _id: rawUser._id || rawUser.id,
    id: rawUser.id || rawUser._id,
    name:
      rawUser.name ||
      `${rawUser.firstName || ""} ${rawUser.lastName || ""}`.trim() ||
      rawUser.email,
    firstName: rawUser.firstName || "",
    lastName: rawUser.lastName || "",
    email: rawUser.email,
    role: rawUser.role,
    center,
    centerId: rawUser.centerId || center?._id || center || null,
    centerName: rawUser.centerName || center?.centerName || "",
    centerCode: rawUser.centerCode || center?.centerCode || "",
    forcePasswordChange: rawUser.forcePasswordChange || false,
    passwordChangedAt: rawUser.passwordChangedAt || null,
  };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");

    if (savedToken && savedUser) {
      try {
        setUser(normalizeUser(JSON.parse(savedUser)));
      } catch (error) {
        console.error("Invalid saved user:", error);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }

    setAuthLoading(false);
  }, []);

  const login = async (email, password) => {
    const res = await API.post("/auth/login", { email, password });

    const token = res.data?.data?.token || res.data?.token;
    const loggedInUser = res.data?.data?.user || res.data?.user;

    if (!token) {
      throw new Error("Token not received from backend");
    }

    if (!loggedInUser) {
      throw new Error("User data not received from backend");
    }

    const cleanUser = normalizeUser(loggedInUser);

    if (!cleanUser.role) {
      throw new Error("User role not received from backend");
    }

    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(cleanUser));
    setUser(cleanUser);

    return cleanUser;
  };

  const updateUser = (updatedUser) => {
    const cleanUser = normalizeUser(updatedUser);
    localStorage.setItem("user", JSON.stringify(cleanUser));
    setUser(cleanUser);
    return cleanUser;
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  const value = {
    user,
    login,
    logout,
    updateUser,
    authLoading,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);