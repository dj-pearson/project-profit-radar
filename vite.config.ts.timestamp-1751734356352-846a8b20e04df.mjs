// vite.config.ts
import { defineConfig } from "file:///C:/Users/pears/OneDrive/Documents/BuildDesk/project-profit-radar/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/pears/OneDrive/Documents/BuildDesk/project-profit-radar/node_modules/@vitejs/plugin-react-swc/index.mjs";
import path from "path";
import { componentTagger } from "file:///C:/Users/pears/OneDrive/Documents/BuildDesk/project-profit-radar/node_modules/lovable-tagger/dist/index.js";
var __vite_injected_original_dirname = "C:\\Users\\pears\\OneDrive\\Documents\\BuildDesk\\project-profit-radar";
var vite_config_default = defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080
  },
  plugins: [
    react(),
    mode === "development" && componentTagger()
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  },
  // Build optimizations for Cloudflare Pages
  build: {
    target: "esnext",
    minify: "esbuild",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          ui: ["@radix-ui/react-slot", "@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu", "@radix-ui/react-select", "@radix-ui/react-popover"],
          radix: ["@radix-ui/react-accordion", "@radix-ui/react-alert-dialog", "@radix-ui/react-tabs", "@radix-ui/react-toast", "@radix-ui/react-tooltip"],
          utils: ["clsx", "tailwind-merge", "class-variance-authority"],
          forms: ["react-hook-form", "@hookform/resolvers", "zod"],
          router: ["react-router-dom"],
          supabase: ["@supabase/supabase-js"],
          charts: ["recharts"],
          pdf: ["jspdf", "jspdf-autotable"],
          excel: ["xlsx"],
          query: ["@tanstack/react-query"]
        },
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]"
      },
      // Reduce bundle size by excluding heavy dependencies not needed in production
      external: mode === "production" ? ["@capacitor/core", "@capacitor/android", "@capacitor/ios", "@capacitor/cli"] : []
    },
    chunkSizeWarningLimit: 1e3,
    // Optimize for faster builds
    reportCompressedSize: false,
    // Enable build caching
    emptyOutDir: true
  },
  // Optimize dependency pre-bundling
  optimizeDeps: {
    include: ["react", "react-dom"],
    exclude: ["@capacitor/core", "@capacitor/android", "@capacitor/ios", "@capacitor/cli"]
  },
  // Reduce memory usage during build
  esbuild: {
    logOverride: { "this-is-undefined-in-esm": "silent" }
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxwZWFyc1xcXFxPbmVEcml2ZVxcXFxEb2N1bWVudHNcXFxcQnVpbGREZXNrXFxcXHByb2plY3QtcHJvZml0LXJhZGFyXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxwZWFyc1xcXFxPbmVEcml2ZVxcXFxEb2N1bWVudHNcXFxcQnVpbGREZXNrXFxcXHByb2plY3QtcHJvZml0LXJhZGFyXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9wZWFycy9PbmVEcml2ZS9Eb2N1bWVudHMvQnVpbGREZXNrL3Byb2plY3QtcHJvZml0LXJhZGFyL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcclxuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2NcIjtcclxuaW1wb3J0IHBhdGggZnJvbSBcInBhdGhcIjtcclxuaW1wb3J0IHsgY29tcG9uZW50VGFnZ2VyIH0gZnJvbSBcImxvdmFibGUtdGFnZ2VyXCI7XHJcblxyXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9KSA9PiAoe1xyXG4gIHNlcnZlcjoge1xyXG4gICAgaG9zdDogXCI6OlwiLFxyXG4gICAgcG9ydDogODA4MCxcclxuICB9LFxyXG4gIHBsdWdpbnM6IFtcclxuICAgIHJlYWN0KCksXHJcbiAgICBtb2RlID09PSAnZGV2ZWxvcG1lbnQnICYmXHJcbiAgICBjb21wb25lbnRUYWdnZXIoKSxcclxuICBdLmZpbHRlcihCb29sZWFuKSxcclxuICByZXNvbHZlOiB7XHJcbiAgICBhbGlhczoge1xyXG4gICAgICBcIkBcIjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuL3NyY1wiKSxcclxuICAgIH0sXHJcbiAgfSxcclxuICAvLyBCdWlsZCBvcHRpbWl6YXRpb25zIGZvciBDbG91ZGZsYXJlIFBhZ2VzXHJcbiAgYnVpbGQ6IHtcclxuICAgIHRhcmdldDogJ2VzbmV4dCcsXHJcbiAgICBtaW5pZnk6ICdlc2J1aWxkJyxcclxuICAgIHNvdXJjZW1hcDogZmFsc2UsXHJcbiAgICByb2xsdXBPcHRpb25zOiB7XHJcbiAgICAgIG91dHB1dDoge1xyXG4gICAgICAgIG1hbnVhbENodW5rczoge1xyXG4gICAgICAgICAgdmVuZG9yOiBbJ3JlYWN0JywgJ3JlYWN0LWRvbSddLFxyXG4gICAgICAgICAgdWk6IFsnQHJhZGl4LXVpL3JlYWN0LXNsb3QnLCAnQHJhZGl4LXVpL3JlYWN0LWRpYWxvZycsICdAcmFkaXgtdWkvcmVhY3QtZHJvcGRvd24tbWVudScsICdAcmFkaXgtdWkvcmVhY3Qtc2VsZWN0JywgJ0ByYWRpeC11aS9yZWFjdC1wb3BvdmVyJ10sXHJcbiAgICAgICAgICByYWRpeDogWydAcmFkaXgtdWkvcmVhY3QtYWNjb3JkaW9uJywgJ0ByYWRpeC11aS9yZWFjdC1hbGVydC1kaWFsb2cnLCAnQHJhZGl4LXVpL3JlYWN0LXRhYnMnLCAnQHJhZGl4LXVpL3JlYWN0LXRvYXN0JywgJ0ByYWRpeC11aS9yZWFjdC10b29sdGlwJ10sXHJcbiAgICAgICAgICB1dGlsczogWydjbHN4JywgJ3RhaWx3aW5kLW1lcmdlJywgJ2NsYXNzLXZhcmlhbmNlLWF1dGhvcml0eSddLFxyXG4gICAgICAgICAgZm9ybXM6IFsncmVhY3QtaG9vay1mb3JtJywgJ0Bob29rZm9ybS9yZXNvbHZlcnMnLCAnem9kJ10sXHJcbiAgICAgICAgICByb3V0ZXI6IFsncmVhY3Qtcm91dGVyLWRvbSddLFxyXG4gICAgICAgICAgc3VwYWJhc2U6IFsnQHN1cGFiYXNlL3N1cGFiYXNlLWpzJ10sXHJcbiAgICAgICAgICBjaGFydHM6IFsncmVjaGFydHMnXSxcclxuICAgICAgICAgIHBkZjogWydqc3BkZicsICdqc3BkZi1hdXRvdGFibGUnXSxcclxuICAgICAgICAgIGV4Y2VsOiBbJ3hsc3gnXSxcclxuICAgICAgICAgIHF1ZXJ5OiBbJ0B0YW5zdGFjay9yZWFjdC1xdWVyeSddXHJcbiAgICAgICAgfSxcclxuICAgICAgICBjaHVua0ZpbGVOYW1lczogJ2Fzc2V0cy9bbmFtZV0tW2hhc2hdLmpzJyxcclxuICAgICAgICBlbnRyeUZpbGVOYW1lczogJ2Fzc2V0cy9bbmFtZV0tW2hhc2hdLmpzJyxcclxuICAgICAgICBhc3NldEZpbGVOYW1lczogJ2Fzc2V0cy9bbmFtZV0tW2hhc2hdLltleHRdJ1xyXG4gICAgICB9LFxyXG4gICAgICAvLyBSZWR1Y2UgYnVuZGxlIHNpemUgYnkgZXhjbHVkaW5nIGhlYXZ5IGRlcGVuZGVuY2llcyBub3QgbmVlZGVkIGluIHByb2R1Y3Rpb25cclxuICAgICAgZXh0ZXJuYWw6IG1vZGUgPT09ICdwcm9kdWN0aW9uJyA/IFsnQGNhcGFjaXRvci9jb3JlJywgJ0BjYXBhY2l0b3IvYW5kcm9pZCcsICdAY2FwYWNpdG9yL2lvcycsICdAY2FwYWNpdG9yL2NsaSddIDogW11cclxuICAgIH0sXHJcbiAgICBjaHVua1NpemVXYXJuaW5nTGltaXQ6IDEwMDAsXHJcbiAgICAvLyBPcHRpbWl6ZSBmb3IgZmFzdGVyIGJ1aWxkc1xyXG4gICAgcmVwb3J0Q29tcHJlc3NlZFNpemU6IGZhbHNlLFxyXG4gICAgLy8gRW5hYmxlIGJ1aWxkIGNhY2hpbmdcclxuICAgIGVtcHR5T3V0RGlyOiB0cnVlXHJcbiAgfSxcclxuICAvLyBPcHRpbWl6ZSBkZXBlbmRlbmN5IHByZS1idW5kbGluZ1xyXG4gIG9wdGltaXplRGVwczoge1xyXG4gICAgaW5jbHVkZTogWydyZWFjdCcsICdyZWFjdC1kb20nXSxcclxuICAgIGV4Y2x1ZGU6IFsnQGNhcGFjaXRvci9jb3JlJywgJ0BjYXBhY2l0b3IvYW5kcm9pZCcsICdAY2FwYWNpdG9yL2lvcycsICdAY2FwYWNpdG9yL2NsaSddXHJcbiAgfSxcclxuICAvLyBSZWR1Y2UgbWVtb3J5IHVzYWdlIGR1cmluZyBidWlsZFxyXG4gIGVzYnVpbGQ6IHtcclxuICAgIGxvZ092ZXJyaWRlOiB7ICd0aGlzLWlzLXVuZGVmaW5lZC1pbi1lc20nOiAnc2lsZW50JyB9XHJcbiAgfVxyXG59KSk7XHJcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBZ1ksU0FBUyxvQkFBb0I7QUFDN1osT0FBTyxXQUFXO0FBQ2xCLE9BQU8sVUFBVTtBQUNqQixTQUFTLHVCQUF1QjtBQUhoQyxJQUFNLG1DQUFtQztBQU16QyxJQUFPLHNCQUFRLGFBQWEsQ0FBQyxFQUFFLEtBQUssT0FBTztBQUFBLEVBQ3pDLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLE1BQU07QUFBQSxFQUNSO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUCxNQUFNO0FBQUEsSUFDTixTQUFTLGlCQUNULGdCQUFnQjtBQUFBLEVBQ2xCLEVBQUUsT0FBTyxPQUFPO0FBQUEsRUFDaEIsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBLE1BQ0wsS0FBSyxLQUFLLFFBQVEsa0NBQVcsT0FBTztBQUFBLElBQ3RDO0FBQUEsRUFDRjtBQUFBO0FBQUEsRUFFQSxPQUFPO0FBQUEsSUFDTCxRQUFRO0FBQUEsSUFDUixRQUFRO0FBQUEsSUFDUixXQUFXO0FBQUEsSUFDWCxlQUFlO0FBQUEsTUFDYixRQUFRO0FBQUEsUUFDTixjQUFjO0FBQUEsVUFDWixRQUFRLENBQUMsU0FBUyxXQUFXO0FBQUEsVUFDN0IsSUFBSSxDQUFDLHdCQUF3QiwwQkFBMEIsaUNBQWlDLDBCQUEwQix5QkFBeUI7QUFBQSxVQUMzSSxPQUFPLENBQUMsNkJBQTZCLGdDQUFnQyx3QkFBd0IseUJBQXlCLHlCQUF5QjtBQUFBLFVBQy9JLE9BQU8sQ0FBQyxRQUFRLGtCQUFrQiwwQkFBMEI7QUFBQSxVQUM1RCxPQUFPLENBQUMsbUJBQW1CLHVCQUF1QixLQUFLO0FBQUEsVUFDdkQsUUFBUSxDQUFDLGtCQUFrQjtBQUFBLFVBQzNCLFVBQVUsQ0FBQyx1QkFBdUI7QUFBQSxVQUNsQyxRQUFRLENBQUMsVUFBVTtBQUFBLFVBQ25CLEtBQUssQ0FBQyxTQUFTLGlCQUFpQjtBQUFBLFVBQ2hDLE9BQU8sQ0FBQyxNQUFNO0FBQUEsVUFDZCxPQUFPLENBQUMsdUJBQXVCO0FBQUEsUUFDakM7QUFBQSxRQUNBLGdCQUFnQjtBQUFBLFFBQ2hCLGdCQUFnQjtBQUFBLFFBQ2hCLGdCQUFnQjtBQUFBLE1BQ2xCO0FBQUE7QUFBQSxNQUVBLFVBQVUsU0FBUyxlQUFlLENBQUMsbUJBQW1CLHNCQUFzQixrQkFBa0IsZ0JBQWdCLElBQUksQ0FBQztBQUFBLElBQ3JIO0FBQUEsSUFDQSx1QkFBdUI7QUFBQTtBQUFBLElBRXZCLHNCQUFzQjtBQUFBO0FBQUEsSUFFdEIsYUFBYTtBQUFBLEVBQ2Y7QUFBQTtBQUFBLEVBRUEsY0FBYztBQUFBLElBQ1osU0FBUyxDQUFDLFNBQVMsV0FBVztBQUFBLElBQzlCLFNBQVMsQ0FBQyxtQkFBbUIsc0JBQXNCLGtCQUFrQixnQkFBZ0I7QUFBQSxFQUN2RjtBQUFBO0FBQUEsRUFFQSxTQUFTO0FBQUEsSUFDUCxhQUFhLEVBQUUsNEJBQTRCLFNBQVM7QUFBQSxFQUN0RDtBQUNGLEVBQUU7IiwKICAibmFtZXMiOiBbXQp9Cg==
