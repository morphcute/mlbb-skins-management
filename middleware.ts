import { withAuth } from "next-auth/middleware";

export default withAuth(
  function middleware() {
    return;
  },
  {
    pages: {
      signIn: "/login",
    },
    callbacks: {
      authorized: ({ token, req }) => {
        if (!token) {
          return false;
        }

        const pathname = req.nextUrl.pathname;

        if (pathname.startsWith("/admin")) {
          return token.role === "ADMIN";
        }

        if (pathname.startsWith("/supplier")) {
          return token.role === "SUPPLIER";
        }

        if (pathname.startsWith("/viewer")) {
          return token.role === "VIEWER";
        }

        return true;
      },
    },
  },
);

export const config = {
  matcher: ["/admin/:path*", "/supplier/:path*", "/viewer/:path*"],
};
