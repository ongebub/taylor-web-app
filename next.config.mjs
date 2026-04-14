/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "static.wixstatic.com",
      },
      {
        protocol: "https",
        hostname: "icfszyscgeuljmaavplj.supabase.co",
      },
    ],
  },
  async headers() {
    return [
      {
        // Allow the Wix site (and anything else embedding on HTTPS)
        // to iframe the embeddable login widget.
        source: "/portal-login-embed",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self' https://*.taylorext.com https://taylorext.com https://*.wixsite.com https://*.editorx.io",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
