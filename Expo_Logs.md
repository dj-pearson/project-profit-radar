env: load .env
env: export VITE_SUPABASE_PROJECT_ID VITE_SUPABASE_PUBLISHABLE_KEY VITE_SUPABASE_URL
Starting Metro Bundler
iOS ./App.tsx ▓▓▓▓░░░░░░░░░░░░ 26.5% (175/340)
WARN  The package /Users/expo/workingdir/build/node_modules/use-latest-callback contains an invalid package.json configuration. Consider raising this issue with the package maintainer(s).
Reason: The resolution for "/Users/expo/workingdir/build/node_modules/use-latest-callback" defined in "exports" is /Users/expo/workingdir/build/node_modules/use-latest-callback/esm.mjs, however this file does not exist. Falling back to file-based resolution.
WARN  The package /Users/expo/workingdir/build/node_modules/use-latest-callback contains an invalid package.json configuration. Consider raising this issue with the package maintainer(s).
Reason: The resolution for "/Users/expo/workingdir/build/node_modules/use-latest-callback" defined in "exports" is /Users/expo/workingdir/build/node_modules/use-latest-callback/esm.mjs, however this file does not exist. Falling back to file-based resolution.
WARN  The package /Users/expo/workingdir/build/node_modules/use-latest-callback contains an invalid package.json configuration. Consider raising this issue with the package maintainer(s).
Reason: The resolution for "/Users/expo/workingdir/build/node_modules/use-latest-callback" defined in "exports" is /Users/expo/workingdir/build/node_modules/use-latest-callback/esm.mjs, however this file does not exist. Falling back to file-based resolution.
iOS Bundling failed 5028ms App.tsx (945 modules)
Unable to resolve module expo-status-bar from /Users/expo/workingdir/build/app/dashboard.tsx: expo-status-bar could not be found within the project or in these directories:
  node_modules
[0m [90m  9 |[39m } [36mfrom[39m [32m'react-native'[39m[33m;[39m
 [90m 10 |[39m [36mimport[39m { [33mLink[39m } [36mfrom[39m [32m'expo-router'[39m[33m;[39m
[31m[1m>[22m[39m[90m 11 |[39m [36mimport[39m { [33mStatusBar[39m } [36mfrom[39m [32m'expo-status-bar'[39m[33m;[39m
 [90m    |[39m                            [31m[1m^[22m[39m
 [90m 12 |[39m [36mimport[39m { useAuth } [36mfrom[39m [32m'../src/contexts/AuthContext'[39m[33m;[39m
 [90m 13 |[39m
 [90m 14 |[39m [36mconst[39m { width } [33m=[39m [33mDimensions[39m[33m.[39m[36mget[39m([32m'window'[39m)[33m;[39m[0m

Import stack:

 app/dashboard.tsx
 | import "expo-status-bar"

 app (require.context)
Error: Unable to resolve module expo-status-bar from /Users/expo/workingdir/build/app/dashboard.tsx: expo-status-bar could not be found within the project or in these directories:
  node_modules
[0m [90m  9 |[39m } [36mfrom[39m [32m'react-native'[39m[33m;[39m
 [90m 10 |[39m [36mimport[39m { [33mLink[39m } [36mfrom[39m [32m'expo-router'[39m[33m;[39m
[31m[1m>[22m[39m[90m 11 |[39m [36mimport[39m { [33mStatusBar[39m } [36mfrom[39m [32m'expo-status-bar'[39m[33m;[39m
 [90m    |[39m                            [31m[1m^[22m[39m
 [90m 12 |[39m [36mimport[39m { useAuth } [36mfrom[39m [32m'../src/contexts/AuthContext'[39m[33m;[39m
 [90m 13 |[39m
 [90m 14 |[39m [36mconst[39m { width } [33m=[39m [33mDimensions[39m[33m.[39m[36mget[39m([32m'window'[39m)[33m;[39m[0m

Import stack:

 app/dashboard.tsx
 | import "expo-status-bar"

 app (require.context)
