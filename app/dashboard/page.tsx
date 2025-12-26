import React from "react";
import { checkAuth } from "@/app/utils/checkAuth";
import { redirect } from "next/navigation";
const page = async () => {
  const auth = await checkAuth();
  if (!auth) {
    redirect("/login?reason=auth");
  }
  return <div>hello</div>;
};

export default page;
