import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: { signIn: "/login" },
});

export const config = {
  matcher: ["/dashboard/:path*", "/attendance/:path*", "/reports/:path*", "/admin/:path*"],
};
