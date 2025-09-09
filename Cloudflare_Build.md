2025-09-09T19:19:21.574534Z	Cloning repository...
2025-09-09T19:19:25.29009Z	From https://github.com/dj-pearson/project-profit-radar
2025-09-09T19:19:25.290541Z	 * branch            3196f73a00f3e17073875fdc0d20c66b3b8237bd -> FETCH_HEAD
2025-09-09T19:19:25.290653Z	
2025-09-09T19:19:25.558842Z	HEAD is now at 3196f73 Implement Cloudflare build fix with custom script and update package.json
2025-09-09T19:19:25.559312Z	
2025-09-09T19:19:25.64952Z	
2025-09-09T19:19:25.649987Z	Using v2 root directory strategy
2025-09-09T19:19:25.672573Z	Success: Finished cloning repository files
2025-09-09T19:19:27.432507Z	Checking for configuration in a Wrangler configuration file (BETA)
2025-09-09T19:19:27.433596Z	
2025-09-09T19:19:27.434682Z	Found wrangler.toml file. Reading build configuration...
2025-09-09T19:19:27.4407Z	pages_build_output_dir: dist
2025-09-09T19:19:27.441169Z	Build environment variables: (none found)
2025-09-09T19:19:28.536211Z	Successfully read wrangler.toml file.
2025-09-09T19:19:28.612608Z	Detected the following tools from environment: nodejs@20.18.0, npm@10.9.2
2025-09-09T19:19:28.613276Z	Installing nodejs 20.18.0
2025-09-09T19:19:29.675859Z	Trying to update node-build... ok
2025-09-09T19:19:29.767788Z	To follow progress, use 'tail -f /tmp/node-build.20250909191929.494.log' or pass --verbose
2025-09-09T19:19:29.864929Z	Downloading node-v20.18.0-linux-x64.tar.gz...
2025-09-09T19:19:30.113047Z	-> https://nodejs.org/dist/v20.18.0/node-v20.18.0-linux-x64.tar.gz
2025-09-09T19:19:31.934006Z	
2025-09-09T19:19:31.934291Z	WARNING: node-v20.18.0-linux-x64 is in LTS Maintenance mode and nearing its end of life.
2025-09-09T19:19:31.934437Z	It only receives *critical* security updates, *critical* bug fixes and documentation updates.
2025-09-09T19:19:31.934591Z	
2025-09-09T19:19:31.93477Z	Installing node-v20.18.0-linux-x64...
2025-09-09T19:19:32.333335Z	Installed node-v20.18.0-linux-x64 to /opt/buildhome/.asdf/installs/nodejs/20.18.0
2025-09-09T19:19:32.333629Z	
2025-09-09T19:19:33.328532Z	Installing project dependencies: npm clean-install --progress=false
2025-09-09T19:19:36.040942Z	npm error code EUSAGE
2025-09-09T19:19:36.041232Z	npm error
2025-09-09T19:19:36.041374Z	npm error `npm ci` can only install packages when your package.json and package-lock.json or npm-shrinkwrap.json are in sync. Please update your lock file with `npm install` before continuing.
2025-09-09T19:19:36.041527Z	npm error
2025-09-09T19:19:36.041755Z	npm error Missing: @rollup/rollup-android-arm-eabi@4.50.0 from lock file
2025-09-09T19:19:36.041979Z	npm error Missing: @rollup/rollup-android-arm64@4.50.0 from lock file
2025-09-09T19:19:36.042095Z	npm error Missing: @rollup/rollup-darwin-arm64@4.50.0 from lock file
2025-09-09T19:19:36.042177Z	npm error Missing: @rollup/rollup-darwin-x64@4.50.0 from lock file
2025-09-09T19:19:36.042239Z	npm error Missing: @rollup/rollup-freebsd-arm64@4.50.0 from lock file
2025-09-09T19:19:36.0423Z	npm error Missing: @rollup/rollup-freebsd-x64@4.50.0 from lock file
2025-09-09T19:19:36.04236Z	npm error Missing: @rollup/rollup-linux-arm-gnueabihf@4.50.0 from lock file
2025-09-09T19:19:36.042714Z	npm error Missing: @rollup/rollup-linux-arm-musleabihf@4.50.0 from lock file
2025-09-09T19:19:36.042871Z	npm error Missing: @rollup/rollup-linux-arm64-gnu@4.50.0 from lock file
2025-09-09T19:19:36.043049Z	npm error Missing: @rollup/rollup-linux-arm64-musl@4.50.0 from lock file
2025-09-09T19:19:36.043237Z	npm error Missing: @rollup/rollup-linux-loongarch64-gnu@4.50.0 from lock file
2025-09-09T19:19:36.043331Z	npm error Missing: @rollup/rollup-linux-riscv64-gnu@4.50.0 from lock file
2025-09-09T19:19:36.043414Z	npm error Missing: @rollup/rollup-linux-riscv64-musl@4.50.0 from lock file
2025-09-09T19:19:36.04352Z	npm error Missing: @rollup/rollup-linux-s390x-gnu@4.50.0 from lock file
2025-09-09T19:19:36.043627Z	npm error Missing: @rollup/rollup-linux-x64-gnu@4.50.0 from lock file
2025-09-09T19:19:36.043723Z	npm error Missing: @rollup/rollup-linux-x64-musl@4.50.0 from lock file
2025-09-09T19:19:36.04384Z	npm error Missing: @rollup/rollup-win32-arm64-msvc@4.50.0 from lock file
2025-09-09T19:19:36.043959Z	npm error Missing: @rollup/rollup-win32-ia32-msvc@4.50.0 from lock file
2025-09-09T19:19:36.044079Z	npm error Missing: @rollup/rollup-win32-x64-msvc@4.50.0 from lock file
2025-09-09T19:19:36.044184Z	npm error
2025-09-09T19:19:36.044304Z	npm error Clean install a project
2025-09-09T19:19:36.044414Z	npm error
2025-09-09T19:19:36.044514Z	npm error Usage:
2025-09-09T19:19:36.044612Z	npm error npm ci
2025-09-09T19:19:36.044761Z	npm error
2025-09-09T19:19:36.044875Z	npm error Options:
2025-09-09T19:19:36.044995Z	npm error [--install-strategy <hoisted|nested|shallow|linked>] [--legacy-bundling]
2025-09-09T19:19:36.045128Z	npm error [--global-style] [--omit <dev|optional|peer> [--omit <dev|optional|peer> ...]]
2025-09-09T19:19:36.045231Z	npm error [--include <prod|dev|optional|peer> [--include <prod|dev|optional|peer> ...]]
2025-09-09T19:19:36.045347Z	npm error [--strict-peer-deps] [--foreground-scripts] [--ignore-scripts] [--no-audit]
2025-09-09T19:19:36.04544Z	npm error [--no-bin-links] [--no-fund] [--dry-run]
2025-09-09T19:19:36.045534Z	npm error [-w|--workspace <workspace-name> [-w|--workspace <workspace-name> ...]]
2025-09-09T19:19:36.045659Z	npm error [-ws|--workspaces] [--include-workspace-root] [--install-links]
2025-09-09T19:19:36.045766Z	npm error
2025-09-09T19:19:36.045863Z	npm error aliases: clean-install, ic, install-clean, isntall-clean
2025-09-09T19:19:36.045962Z	npm error
2025-09-09T19:19:36.046153Z	npm error Run "npm help ci" for more info
2025-09-09T19:19:36.046296Z	npm error A complete log of this run can be found in: /opt/buildhome/.npm/_logs/2025-09-09T19_19_33_633Z-debug-0.log
2025-09-09T19:19:36.052526Z	Error: Exit with error code: 1
2025-09-09T19:19:36.052664Z	    at ChildProcess.<anonymous> (/snapshot/dist/run-build.js)
2025-09-09T19:19:36.052942Z	    at Object.onceWrapper (node:events:652:26)
2025-09-09T19:19:36.053073Z	    at ChildProcess.emit (node:events:537:28)
2025-09-09T19:19:36.053172Z	    at ChildProcess._handle.onexit (node:internal/child_process:291:12)
2025-09-09T19:19:36.062339Z	Failed: build command exited with code: 1
2025-09-09T19:19:37.754807Z	Failed: error occurred while running build command