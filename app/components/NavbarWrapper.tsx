import React from "react";
import Navbar from "./Navbar";
import { checkAuth } from "../utils/checkAuth";

const NavbarWrapper = async () => {
  const auth = await checkAuth();

  return <Navbar userAuth={auth} />;
};

export default NavbarWrapper;
