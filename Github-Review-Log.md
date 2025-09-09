2025-09-09T18:12:46.3117873Z Current runner version: '2.328.0'
2025-09-09T18:12:46.3141501Z ##[group]Runner Image Provisioner
2025-09-09T18:12:46.3142522Z Hosted Compute Agent
2025-09-09T18:12:46.3143105Z Version: 20250908.385
2025-09-09T18:12:46.3143689Z Commit: cfce01a78eb650f23de9981e2e79cb8dc83e6056
2025-09-09T18:12:46.3144450Z Build Date: 2025-09-08T16:07:37Z
2025-09-09T18:12:46.3145033Z ##[endgroup]
2025-09-09T18:12:46.3145558Z ##[group]Operating System
2025-09-09T18:12:46.3146365Z Ubuntu
2025-09-09T18:12:46.3146871Z 24.04.3
2025-09-09T18:12:46.3147340Z LTS
2025-09-09T18:12:46.3147747Z ##[endgroup]
2025-09-09T18:12:46.3148310Z ##[group]Runner Image
2025-09-09T18:12:46.3148841Z Image: ubuntu-24.04
2025-09-09T18:12:46.3149368Z Version: 20250907.24.1
2025-09-09T18:12:46.3150410Z Included Software: https://github.com/actions/runner-images/blob/ubuntu24/20250907.24/images/ubuntu/Ubuntu2404-Readme.md
2025-09-09T18:12:46.3151940Z Image Release: https://github.com/actions/runner-images/releases/tag/ubuntu24%2F20250907.24
2025-09-09T18:12:46.3152981Z ##[endgroup]
2025-09-09T18:12:46.3154058Z ##[group]GITHUB_TOKEN Permissions
2025-09-09T18:12:46.3156272Z Contents: read
2025-09-09T18:12:46.3156825Z Metadata: read
2025-09-09T18:12:46.3157342Z Packages: read
2025-09-09T18:12:46.3157935Z ##[endgroup]
2025-09-09T18:12:46.3159918Z Secret source: Actions
2025-09-09T18:12:46.3160642Z Prepare workflow directory
2025-09-09T18:12:46.3474463Z Prepare all required actions
2025-09-09T18:12:46.3510888Z Getting action download info
2025-09-09T18:12:46.9429658Z Download action repository 'actions/checkout@v4' (SHA:08eba0b27e820071cde6df949e0beb9ba4906955)
2025-09-09T18:12:47.1498213Z Download action repository 'actions/setup-node@v4' (SHA:49933ea5288caeca8642d1e84afbd3f7d6820020)
2025-09-09T18:12:47.2469120Z Download action repository 'actions/upload-artifact@v4' (SHA:ea165f8d65b6e75b540449e92b4886f43607fa02)
2025-09-09T18:12:47.4585453Z Download action repository 'actions/github-script@v7' (SHA:f28e40c7f34bde8b3046d885e986cb6290c5673b)
2025-09-09T18:12:48.0368409Z Complete job name: performance-audit
2025-09-09T18:12:48.1156845Z ##[group]Run actions/checkout@v4
2025-09-09T18:12:48.1158192Z with:
2025-09-09T18:12:48.1158999Z   repository: dj-pearson/project-profit-radar
2025-09-09T18:12:48.1160296Z   token: ***
2025-09-09T18:12:48.1160989Z   ssh-strict: true
2025-09-09T18:12:48.1161702Z   ssh-user: git
2025-09-09T18:12:48.1162491Z   persist-credentials: true
2025-09-09T18:12:48.1163322Z   clean: true
2025-09-09T18:12:48.1164071Z   sparse-checkout-cone-mode: true
2025-09-09T18:12:48.1164982Z   fetch-depth: 1
2025-09-09T18:12:48.1165704Z   fetch-tags: false
2025-09-09T18:12:48.1166601Z   show-progress: true
2025-09-09T18:12:48.1167357Z   lfs: false
2025-09-09T18:12:48.1168038Z   submodules: false
2025-09-09T18:12:48.1168794Z   set-safe-directory: true
2025-09-09T18:12:48.1169862Z ##[endgroup]
2025-09-09T18:12:48.2311004Z Syncing repository: dj-pearson/project-profit-radar
2025-09-09T18:12:48.2314817Z ##[group]Getting Git version info
2025-09-09T18:12:48.2316792Z Working directory is '/home/runner/work/project-profit-radar/project-profit-radar'
2025-09-09T18:12:48.2320398Z [command]/usr/bin/git version
2025-09-09T18:12:48.2388288Z git version 2.51.0
2025-09-09T18:12:48.2418810Z ##[endgroup]
2025-09-09T18:12:48.2435876Z Temporarily overriding HOME='/home/runner/work/_temp/964f1bc4-5257-4ab7-a448-d65a4a7bbfb9' before making global git config changes
2025-09-09T18:12:48.2448411Z Adding repository directory to the temporary git global config as a safe directory
2025-09-09T18:12:48.2453958Z [command]/usr/bin/git config --global --add safe.directory /home/runner/work/project-profit-radar/project-profit-radar
2025-09-09T18:12:48.2498172Z Deleting the contents of '/home/runner/work/project-profit-radar/project-profit-radar'
2025-09-09T18:12:48.2504436Z ##[group]Initializing the repository
2025-09-09T18:12:48.2509180Z [command]/usr/bin/git init /home/runner/work/project-profit-radar/project-profit-radar
2025-09-09T18:12:48.2605556Z hint: Using 'master' as the name for the initial branch. This default branch name
2025-09-09T18:12:48.2610111Z hint: is subject to change. To configure the initial branch name to use in all
2025-09-09T18:12:48.2613163Z hint: of your new repositories, which will suppress this warning, call:
2025-09-09T18:12:48.2615462Z hint:
2025-09-09T18:12:48.2617150Z hint: 	git config --global init.defaultBranch <name>
2025-09-09T18:12:48.2619041Z hint:
2025-09-09T18:12:48.2620763Z hint: Names commonly chosen instead of 'master' are 'main', 'trunk' and
2025-09-09T18:12:48.2623752Z hint: 'development'. The just-created branch can be renamed via this command:
2025-09-09T18:12:48.2626304Z hint:
2025-09-09T18:12:48.2627498Z hint: 	git branch -m <name>
2025-09-09T18:12:48.2628903Z hint:
2025-09-09T18:12:48.2630773Z hint: Disable this message with "git config set advice.defaultBranchName false"
2025-09-09T18:12:48.2634547Z Initialized empty Git repository in /home/runner/work/project-profit-radar/project-profit-radar/.git/
2025-09-09T18:12:48.2640546Z [command]/usr/bin/git remote add origin https://github.com/dj-pearson/project-profit-radar
2025-09-09T18:12:48.2677814Z ##[endgroup]
2025-09-09T18:12:48.2679929Z ##[group]Disabling automatic garbage collection
2025-09-09T18:12:48.2683001Z [command]/usr/bin/git config --local gc.auto 0
2025-09-09T18:12:48.2715810Z ##[endgroup]
2025-09-09T18:12:48.2718203Z ##[group]Setting up auth
2025-09-09T18:12:48.2723099Z [command]/usr/bin/git config --local --name-only --get-regexp core\.sshCommand
2025-09-09T18:12:48.2763710Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'core\.sshCommand' && git config --local --unset-all 'core.sshCommand' || :"
2025-09-09T18:12:48.3119738Z [command]/usr/bin/git config --local --name-only --get-regexp http\.https\:\/\/github\.com\/\.extraheader
2025-09-09T18:12:48.3153749Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'http\.https\:\/\/github\.com\/\.extraheader' && git config --local --unset-all 'http.https://github.com/.extraheader' || :"
2025-09-09T18:12:48.3383866Z [command]/usr/bin/git config --local http.https://github.com/.extraheader AUTHORIZATION: basic ***
2025-09-09T18:12:48.3420645Z ##[endgroup]
2025-09-09T18:12:48.3424560Z ##[group]Fetching the repository
2025-09-09T18:12:48.3433741Z [command]/usr/bin/git -c protocol.version=2 fetch --no-tags --prune --no-recurse-submodules --depth=1 origin +aa0bc51da6180fe253b1aa5f27fdfea484ea9703:refs/remotes/origin/main
2025-09-09T18:12:51.6968990Z From https://github.com/dj-pearson/project-profit-radar
2025-09-09T18:12:51.6972183Z  * [new ref]         aa0bc51da6180fe253b1aa5f27fdfea484ea9703 -> origin/main
2025-09-09T18:12:51.7015890Z ##[endgroup]
2025-09-09T18:12:51.7027153Z ##[group]Determining the checkout info
2025-09-09T18:12:51.7029685Z ##[endgroup]
2025-09-09T18:12:51.7030157Z [command]/usr/bin/git sparse-checkout disable
2025-09-09T18:12:51.7073446Z [command]/usr/bin/git config --local --unset-all extensions.worktreeConfig
2025-09-09T18:12:51.7117072Z ##[group]Checking out the ref
2025-09-09T18:12:51.7124089Z [command]/usr/bin/git checkout --progress --force -B main refs/remotes/origin/main
2025-09-09T18:12:51.9387497Z Switched to a new branch 'main'
2025-09-09T18:12:51.9390578Z branch 'main' set up to track 'origin/main'.
2025-09-09T18:12:51.9439544Z ##[endgroup]
2025-09-09T18:12:51.9484169Z [command]/usr/bin/git log -1 --format=%H
2025-09-09T18:12:51.9520925Z aa0bc51da6180fe253b1aa5f27fdfea484ea9703
2025-09-09T18:12:51.9773341Z ##[group]Run actions/setup-node@v4
2025-09-09T18:12:51.9773619Z with:
2025-09-09T18:12:51.9773798Z   node-version: 20
2025-09-09T18:12:51.9773984Z   cache: npm
2025-09-09T18:12:51.9774149Z   always-auth: false
2025-09-09T18:12:51.9774340Z   check-latest: false
2025-09-09T18:12:51.9774644Z   token: ***
2025-09-09T18:12:51.9774827Z ##[endgroup]
2025-09-09T18:12:52.1532627Z Found in cache @ /opt/hostedtoolcache/node/20.19.5/x64
2025-09-09T18:12:52.1538365Z ##[group]Environment details
2025-09-09T18:12:52.5940332Z node: v20.19.5
2025-09-09T18:12:52.5941247Z npm: 10.8.2
2025-09-09T18:12:52.5941793Z yarn: 1.22.22
2025-09-09T18:12:52.5944123Z ##[endgroup]
2025-09-09T18:12:52.5967813Z [command]/opt/hostedtoolcache/node/20.19.5/x64/bin/npm config get cache
2025-09-09T18:12:52.8374740Z /home/runner/.npm
2025-09-09T18:12:53.1888004Z npm cache is not found
2025-09-09T18:12:53.2005081Z ##[group]Run npm ci
2025-09-09T18:12:53.2005343Z [36;1mnpm ci[0m
2025-09-09T18:12:53.2070451Z shell: /usr/bin/bash -e {0}
2025-09-09T18:12:53.2070705Z ##[endgroup]
2025-09-09T18:13:04.1868942Z npm error code EUSAGE
2025-09-09T18:13:04.1870100Z npm error
2025-09-09T18:13:04.1872119Z npm error `npm ci` can only install packages when your package.json and package-lock.json or npm-shrinkwrap.json are in sync. Please update your lock file with `npm install` before continuing.
2025-09-09T18:13:04.1873858Z npm error
2025-09-09T18:13:04.1874859Z npm error Missing: @rollup/rollup-android-arm-eabi@4.50.0 from lock file
2025-09-09T18:13:04.1876445Z npm error Missing: @rollup/rollup-android-arm64@4.50.0 from lock file
2025-09-09T18:13:04.1880830Z npm error Missing: @rollup/rollup-darwin-arm64@4.50.0 from lock file
2025-09-09T18:13:04.1882531Z npm error Missing: @rollup/rollup-darwin-x64@4.50.0 from lock file
2025-09-09T18:13:04.1883517Z npm error Missing: @rollup/rollup-freebsd-arm64@4.50.0 from lock file
2025-09-09T18:13:04.1884297Z npm error Missing: @rollup/rollup-freebsd-x64@4.50.0 from lock file
2025-09-09T18:13:04.1885123Z npm error Missing: @rollup/rollup-linux-arm-gnueabihf@4.50.0 from lock file
2025-09-09T18:13:04.1886010Z npm error Missing: @rollup/rollup-linux-arm-musleabihf@4.50.0 from lock file
2025-09-09T18:13:04.1887207Z npm error Missing: @rollup/rollup-linux-arm64-gnu@4.50.0 from lock file
2025-09-09T18:13:04.1888002Z npm error Missing: @rollup/rollup-linux-arm64-musl@4.50.0 from lock file
2025-09-09T18:13:04.1888867Z npm error Missing: @rollup/rollup-linux-loongarch64-gnu@4.50.0 from lock file
2025-09-09T18:13:04.1889732Z npm error Missing: @rollup/rollup-linux-riscv64-gnu@4.50.0 from lock file
2025-09-09T18:13:04.1895628Z npm error Missing: @rollup/rollup-linux-riscv64-musl@4.50.0 from lock file
2025-09-09T18:13:04.1896781Z npm error Missing: @rollup/rollup-linux-s390x-gnu@4.50.0 from lock file
2025-09-09T18:13:04.1897700Z npm error Missing: @rollup/rollup-linux-x64-gnu@4.50.0 from lock file
2025-09-09T18:13:04.1898580Z npm error Missing: @rollup/rollup-linux-x64-musl@4.50.0 from lock file
2025-09-09T18:13:04.1899477Z npm error Missing: @rollup/rollup-win32-arm64-msvc@4.50.0 from lock file
2025-09-09T18:13:04.1900375Z npm error Missing: @rollup/rollup-win32-ia32-msvc@4.50.0 from lock file
2025-09-09T18:13:04.1901275Z npm error Missing: @rollup/rollup-win32-x64-msvc@4.50.0 from lock file
2025-09-09T18:13:04.1901837Z npm error
2025-09-09T18:13:04.1902225Z npm error Clean install a project
2025-09-09T18:13:04.1902615Z npm error
2025-09-09T18:13:04.1902941Z npm error Usage:
2025-09-09T18:13:04.1903261Z npm error npm ci
2025-09-09T18:13:04.1903561Z npm error
2025-09-09T18:13:04.1903883Z npm error Options:
2025-09-09T18:13:04.1904621Z npm error [--install-strategy <hoisted|nested|shallow|linked>] [--legacy-bundling]
2025-09-09T18:13:04.1905725Z npm error [--global-style] [--omit <dev|optional|peer> [--omit <dev|optional|peer> ...]]
2025-09-09T18:13:04.1907065Z npm error [--include <prod|dev|optional|peer> [--include <prod|dev|optional|peer> ...]]
2025-09-09T18:13:04.1908199Z npm error [--strict-peer-deps] [--foreground-scripts] [--ignore-scripts] [--no-audit]
2025-09-09T18:13:04.1909205Z npm error [--no-bin-links] [--no-fund] [--dry-run]
2025-09-09T18:13:04.1910052Z npm error [-w|--workspace <workspace-name> [-w|--workspace <workspace-name> ...]]
2025-09-09T18:13:04.1910980Z npm error [-ws|--workspaces] [--include-workspace-root] [--install-links]
2025-09-09T18:13:04.1911572Z npm error
2025-09-09T18:13:04.1912164Z npm error aliases: clean-install, ic, install-clean, isntall-clean
2025-09-09T18:13:04.1912733Z npm error
2025-09-09T18:13:04.1913146Z npm error Run "npm help ci" for more info
2025-09-09T18:13:04.1914434Z npm error A complete log of this run can be found in: /home/runner/.npm/_logs/2025-09-09T18_12_53_274Z-debug-0.log
2025-09-09T18:13:04.1983756Z ##[error]Process completed with exit code 1.
2025-09-09T18:13:04.2062231Z ##[group]Run actions/upload-artifact@v4
2025-09-09T18:13:04.2062513Z with:
2025-09-09T18:13:04.2062696Z   name: performance-reports
2025-09-09T18:13:04.2062950Z   path: performance-*.json
dist/stats.html

2025-09-09T18:13:04.2063199Z   retention-days: 30
2025-09-09T18:13:04.2063408Z   if-no-files-found: warn
2025-09-09T18:13:04.2063607Z   compression-level: 6
2025-09-09T18:13:04.2063801Z   overwrite: false
2025-09-09T18:13:04.2063984Z   include-hidden-files: false
2025-09-09T18:13:04.2064196Z ##[endgroup]
2025-09-09T18:13:04.4311556Z ##[warning]No files were found with the provided path: performance-*.json
dist/stats.html. No artifacts will be uploaded.
2025-09-09T18:13:04.4445873Z Post job cleanup.
2025-09-09T18:13:04.5385862Z [command]/usr/bin/git version
2025-09-09T18:13:04.5425855Z git version 2.51.0
2025-09-09T18:13:04.5471243Z Temporarily overriding HOME='/home/runner/work/_temp/acc6d371-4902-4acd-bfb3-85b1267879da' before making global git config changes
2025-09-09T18:13:04.5473356Z Adding repository directory to the temporary git global config as a safe directory
2025-09-09T18:13:04.5477956Z [command]/usr/bin/git config --global --add safe.directory /home/runner/work/project-profit-radar/project-profit-radar
2025-09-09T18:13:04.5520747Z [command]/usr/bin/git config --local --name-only --get-regexp core\.sshCommand
2025-09-09T18:13:04.5556703Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'core\.sshCommand' && git config --local --unset-all 'core.sshCommand' || :"
2025-09-09T18:13:04.5799107Z [command]/usr/bin/git config --local --name-only --get-regexp http\.https\:\/\/github\.com\/\.extraheader
2025-09-09T18:13:04.5822107Z http.https://github.com/.extraheader
2025-09-09T18:13:04.5838184Z [command]/usr/bin/git config --local --unset-all http.https://github.com/.extraheader
2025-09-09T18:13:04.5872044Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'http\.https\:\/\/github\.com\/\.extraheader' && git config --local --unset-all 'http.https://github.com/.extraheader' || :"
2025-09-09T18:13:04.6233423Z Cleaning up orphan processes
Apollo
