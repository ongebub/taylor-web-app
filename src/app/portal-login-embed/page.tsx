import LoginWidget from "../portal-login/LoginWidget";

export const metadata = {
  title: "Find Your Project",
};

// Embedded version — no header / footer, transparent background, minimal
// padding. Designed to be dropped into an iframe on taylorext.com.
export default function PortalLoginEmbedPage() {
  return (
    <div className="bg-transparent p-3">
      <LoginWidget embed />
    </div>
  );
}
