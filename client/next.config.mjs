/** @type {import('next').NextConfig} */
const nextConfig = {
	images: {
		remotePatterns: [
			{
				protocol: 'https',
				hostname: 'images.unsplash.com',
				port: '',
				pathname: '/**'
			}
		]
	},
	eslint: {
		ignoreDuringBuilds: true
	}
};

// Allow additional common external image hosts used by the app
nextConfig.images.remotePatterns.push(
		{ protocol: 'https', hostname: 'i0.wp.com', port: '', pathname: '/**' },
		{ protocol: 'https', hostname: 'i1.wp.com', port: '', pathname: '/**' },
	{ protocol: 'https', hostname: 'res.cloudinary.com', port: '', pathname: '/**' },
	{ protocol: 'https', hostname: 'user-images.githubusercontent.com', port: '', pathname: '/**' },
	{ protocol: 'https', hostname: 'cdnjs.cloudflare.com', port: '', pathname: '/**' },
	{ protocol: 'https', hostname: 'unpkg.com', port: '', pathname: '/**' }
);

export default nextConfig;
