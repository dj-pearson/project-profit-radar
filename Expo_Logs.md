Running "npm ci --include=dev" in /Users/expo/workingdir/build directory
npm warn ERESOLVE overriding peer dependency
npm warn While resolving: @monogrid/gainmap-js@3.1.0
npm warn Found: three@0.158.0
npm warn node_modules/three
npm warn   three@"^0.158.0" from the root project
npm warn   10 more (@react-spring/three, @react-three/drei, ...)
npm warn
npm warn Could not resolve dependency:
npm warn peer three@">= 0.159.0" from @monogrid/gainmap-js@3.1.0
npm warn node_modules/@monogrid/gainmap-js
npm warn   @monogrid/gainmap-js@"^3.0.6" from @react-three/drei@9.122.0
npm warn   node_modules/@react-three/drei
npm warn
npm warn Conflicting peer dependency: three@0.180.0
npm warn node_modules/three
npm warn   peer three@">= 0.159.0" from @monogrid/gainmap-js@3.1.0
npm warn   node_modules/@monogrid/gainmap-js
npm warn     @monogrid/gainmap-js@"^3.0.6" from @react-three/drei@9.122.0
npm warn     node_modules/@react-three/drei
npm warn ERESOLVE overriding peer dependency
npm warn While resolving: @react-native/virtualized-lists@0.82.0
npm warn Found: @types/react@18.3.24
npm warn node_modules/@types/react
npm warn   dev @types/react@"^18.3.3" from the root project
npm warn   65 more (@radix-ui/react-accordion, ...)
npm warn
npm warn Could not resolve dependency:
npm warn peerOptional @types/react@"^19.1.1" from @react-native/virtualized-lists@0.82.0
npm warn node_modules/@react-native/virtualized-lists
npm warn   @react-native/virtualized-lists@"0.82.0" from react-native@0.82.0
npm warn   node_modules/react-native
npm warn
npm warn Conflicting peer dependency: @types/react@19.2.2
npm warn node_modules/@types/react
npm warn   peerOptional @types/react@"^19.1.1" from @react-native/virtualized-lists@0.82.0
npm warn   node_modules/@react-native/virtualized-lists
npm warn     @react-native/virtualized-lists@"0.82.0" from react-native@0.82.0
npm warn     node_modules/react-native
npm error code ERESOLVE
npm error ERESOLVE could not resolve
npm error
npm error While resolving: react-native@0.82.0
npm error Found: @types/react@18.3.24
npm error node_modules/@types/react
npm error   dev @types/react@"^18.3.3" from the root project
npm error   peerOptional @types/react@"*" from @radix-ui/react-accordion@1.2.11
npm error   node_modules/@radix-ui/react-accordion
npm error     @radix-ui/react-accordion@"^1.2.0" from the root project
npm error   64 more (@radix-ui/react-alert-dialog, @radix-ui/react-arrow, ...)
npm error
npm error Could not resolve dependency:
npm error peerOptional @types/react@"^19.1.1" from react-native@0.82.0
npm error node_modules/react-native
npm error   react-native@"0.82.0" from the root project
npm error   peerOptional react-native@"*" from @expo/cli@54.0.11
npm error   node_modules/@expo/cli
npm error     @expo/cli@"54.0.11" from the root project
npm error     1 more (expo)
npm error   27 more (@expo/devtools, @expo/metro-runtime, ...)
npm error
npm error Conflicting peer dependency: @types/react@19.2.2
npm error node_modules/@types/react
npm error   peerOptional @types/react@"^19.1.1" from react-native@0.82.0
npm error   node_modules/react-native
npm error     react-native@"0.82.0" from the root project
npm error     peerOptional react-native@"*" from @expo/cli@54.0.11
npm error     node_modules/@expo/cli
npm error       @expo/cli@"54.0.11" from the root project
npm error       1 more (expo)
npm error     27 more (@expo/devtools, @expo/metro-runtime, ...)
npm error
npm error Fix the upstream dependency conflict, or retry
npm error this command with --force or --legacy-peer-deps
npm error to accept an incorrect (and potentially broken) dependency resolution.
npm error
npm error
npm error For a full report see:
npm error /Users/expo/.npm/_logs/2025-10-20T19_03_33_343Z-eresolve-report.txt
npm error A complete log of this run can be found in: /Users/expo/.npm/_logs/2025-10-20T19_03_33_343Z-debug-0.log

Build failed
