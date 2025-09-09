2025-09-09T18:32:47.904779Z	Cloning repository...
2025-09-09T18:33:00.96642Z	From https://github.com/dj-pearson/project-profit-radar
2025-09-09T18:33:00.966872Z	 * branch            894de0f4a3e2dfc0f09693c0e496fe8772c67808 -> FETCH_HEAD
2025-09-09T18:33:00.966969Z	
2025-09-09T18:33:01.2578Z	HEAD is now at 894de0f Remove performance budget checker scripts
2025-09-09T18:33:01.258219Z	
2025-09-09T18:33:01.34488Z	
2025-09-09T18:33:01.345705Z	Using v2 root directory strategy
2025-09-09T18:33:01.368753Z	Success: Finished cloning repository files
2025-09-09T18:33:03.53128Z	Checking for configuration in a Wrangler configuration file (BETA)
2025-09-09T18:33:03.531962Z	
2025-09-09T18:33:03.533242Z	Found wrangler.toml file. Reading build configuration...
2025-09-09T18:33:03.539296Z	pages_build_output_dir: dist
2025-09-09T18:33:03.539426Z	Build environment variables: (none found)
2025-09-09T18:33:04.663633Z	Successfully read wrangler.toml file.
2025-09-09T18:33:04.739254Z	Detected the following tools from environment: nodejs@20.18.0, npm@10.9.2
2025-09-09T18:33:04.739798Z	Installing nodejs 20.18.0
2025-09-09T18:33:05.850381Z	Trying to update node-build... ok
2025-09-09T18:33:05.950126Z	To follow progress, use 'tail -f /tmp/node-build.20250909183305.494.log' or pass --verbose
2025-09-09T18:33:06.048648Z	Downloading node-v20.18.0-linux-x64.tar.gz...
2025-09-09T18:33:06.352328Z	-> https://nodejs.org/dist/v20.18.0/node-v20.18.0-linux-x64.tar.gz
2025-09-09T18:33:08.312501Z	
2025-09-09T18:33:08.312789Z	WARNING: node-v20.18.0-linux-x64 is in LTS Maintenance mode and nearing its end of life.
2025-09-09T18:33:08.3129Z	It only receives *critical* security updates, *critical* bug fixes and documentation updates.
2025-09-09T18:33:08.312998Z	
2025-09-09T18:33:08.313098Z	Installing node-v20.18.0-linux-x64...
2025-09-09T18:33:08.702267Z	Installed node-v20.18.0-linux-x64 to /opt/buildhome/.asdf/installs/nodejs/20.18.0
2025-09-09T18:33:08.702917Z	
2025-09-09T18:33:09.725775Z	Installing project dependencies: npm clean-install --progress=false
2025-09-09T18:33:12.450815Z	npm error code EUSAGE
2025-09-09T18:33:12.451121Z	npm error
2025-09-09T18:33:12.451269Z	npm error `npm ci` can only install packages when your package.json and package-lock.json or npm-shrinkwrap.json are in sync. Please update your lock file with `npm install` before continuing.
2025-09-09T18:33:12.451452Z	npm error
2025-09-09T18:33:12.451589Z	npm error Missing: @rollup/rollup-android-arm-eabi@4.50.0 from lock file
2025-09-09T18:33:12.451719Z	npm error Missing: @rollup/rollup-android-arm64@4.50.0 from lock file
2025-09-09T18:33:12.451802Z	npm error Missing: @rollup/rollup-darwin-arm64@4.50.0 from lock file
2025-09-09T18:33:12.451871Z	npm error Missing: @rollup/rollup-darwin-x64@4.50.0 from lock file
2025-09-09T18:33:12.451932Z	npm error Missing: @rollup/rollup-freebsd-arm64@4.50.0 from lock file
2025-09-09T18:33:12.452021Z	npm error Missing: @rollup/rollup-freebsd-x64@4.50.0 from lock file
2025-09-09T18:33:12.452103Z	npm error Missing: @rollup/rollup-linux-arm-gnueabihf@4.50.0 from lock file
2025-09-09T18:33:12.452216Z	npm error Missing: @rollup/rollup-linux-arm-musleabihf@4.50.0 from lock file
2025-09-09T18:33:12.452313Z	npm error Missing: @rollup/rollup-linux-arm64-gnu@4.50.0 from lock file
2025-09-09T18:33:12.452614Z	npm error Missing: @rollup/rollup-linux-arm64-musl@4.50.0 from lock file
2025-09-09T18:33:12.452783Z	npm error Missing: @rollup/rollup-linux-loongarch64-gnu@4.50.0 from lock file
2025-09-09T18:33:12.452895Z	npm error Missing: @rollup/rollup-linux-riscv64-gnu@4.50.0 from lock file
2025-09-09T18:33:12.452989Z	npm error Missing: @rollup/rollup-linux-riscv64-musl@4.50.0 from lock file
2025-09-09T18:33:12.453088Z	npm error Missing: @rollup/rollup-linux-s390x-gnu@4.50.0 from lock file
2025-09-09T18:33:12.453201Z	npm error Missing: @rollup/rollup-linux-x64-gnu@4.50.0 from lock file
2025-09-09T18:33:12.453301Z	npm error Missing: @rollup/rollup-linux-x64-musl@4.50.0 from lock file
2025-09-09T18:33:12.453399Z	npm error Missing: @rollup/rollup-win32-arm64-msvc@4.50.0 from lock file
2025-09-09T18:33:12.45349Z	npm error Missing: @rollup/rollup-win32-ia32-msvc@4.50.0 from lock file
2025-09-09T18:33:12.453591Z	npm error Missing: @rollup/rollup-win32-x64-msvc@4.50.0 from lock file
2025-09-09T18:33:12.453705Z	npm error
2025-09-09T18:33:12.453834Z	npm error Clean install a project
2025-09-09T18:33:12.453918Z	npm error
2025-09-09T18:33:12.454013Z	npm error Usage:
2025-09-09T18:33:12.454133Z	npm error npm ci
2025-09-09T18:33:12.45425Z	npm error
2025-09-09T18:33:12.454411Z	npm error Options:
2025-09-09T18:33:12.454536Z	npm error [--install-strategy <hoisted|nested|shallow|linked>] [--legacy-bundling]
2025-09-09T18:33:12.454695Z	npm error [--global-style] [--omit <dev|optional|peer> [--omit <dev|optional|peer> ...]]
2025-09-09T18:33:12.454925Z	npm error [--include <prod|dev|optional|peer> [--include <prod|dev|optional|peer> ...]]
2025-09-09T18:33:12.455105Z	npm error [--strict-peer-deps] [--foreground-scripts] [--ignore-scripts] [--no-audit]
2025-09-09T18:33:12.455266Z	npm error [--no-bin-links] [--no-fund] [--dry-run]
2025-09-09T18:33:12.455385Z	npm error [-w|--workspace <workspace-name> [-w|--workspace <workspace-name> ...]]
2025-09-09T18:33:12.455554Z	npm error [-ws|--workspaces] [--include-workspace-root] [--install-links]
2025-09-09T18:33:12.455752Z	npm error
2025-09-09T18:33:12.455888Z	npm error aliases: clean-install, ic, install-clean, isntall-clean
2025-09-09T18:33:12.455996Z	npm error
2025-09-09T18:33:12.456104Z	npm error Run "npm help ci" for more info
2025-09-09T18:33:12.45626Z	npm error A complete log of this run can be found in: /opt/buildhome/.npm/_logs/2025-09-09T18_33_10_043Z-debug-0.log
2025-09-09T18:33:12.46677Z	Error: Exit with error code: 1
2025-09-09T18:33:12.467031Z	    at ChildProcess.<anonymous> (/snapshot/dist/run-build.js)
2025-09-09T18:33:12.467145Z	    at Object.onceWrapper (node:events:652:26)
2025-09-09T18:33:12.467233Z	    at ChildProcess.emit (node:events:537:28)
2025-09-09T18:33:12.467336Z	    at ChildProcess._handle.onexit (node:internal/child_process:291:12)
2025-09-09T18:33:12.476123Z	Failed: build command exited with code: 1
2025-09-09T18:33:14.277346Z	Failed: error occurred while running build command