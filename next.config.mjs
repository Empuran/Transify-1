// /** @type {import('next').NextConfig} */
// const nextConfig = {
//   typescript: {
//     ignoreBuildErrors: false,
//   },
//   images: {
//     unoptimized: true,
//   },
// }

// export default nextConfig
/** @type {import('next').NextConfig} */

const nextConfig = {

  output: 'export', // CRITICAL: This generates the folder for the APK

  typescript: {

    ignoreBuildErrors: true, // Helps if there are small type mismatches

  },

  images: {

    unoptimized: true,

  },

};
 
export default nextConfig;
 