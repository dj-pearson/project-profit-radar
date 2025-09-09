2025-09-09T18:09:48.8600988Z Current runner version: '2.328.0'
2025-09-09T18:09:48.8634475Z ##[group]Runner Image Provisioner
2025-09-09T18:09:48.8635777Z Hosted Compute Agent
2025-09-09T18:09:48.8636671Z Version: 20250908.385
2025-09-09T18:09:48.8637575Z Commit: cfce01a78eb650f23de9981e2e79cb8dc83e6056
2025-09-09T18:09:48.9019039Z Build Date: 2025-09-08T16:07:37Z
2025-09-09T18:09:48.9020087Z ##[endgroup]
2025-09-09T18:09:48.9020945Z ##[group]Operating System
2025-09-09T18:09:48.9021900Z Ubuntu
2025-09-09T18:09:48.9022735Z 24.04.3
2025-09-09T18:09:48.9023529Z LTS
2025-09-09T18:09:48.9024387Z ##[endgroup]
2025-09-09T18:09:48.9025327Z ##[group]Runner Image
2025-09-09T18:09:48.9026265Z Image: ubuntu-24.04
2025-09-09T18:09:48.9027320Z Version: 20250907.24.1
2025-09-09T18:09:48.9029377Z Included Software: https://github.com/actions/runner-images/blob/ubuntu24/20250907.24/images/ubuntu/Ubuntu2404-Readme.md
2025-09-09T18:09:48.9032203Z Image Release: https://github.com/actions/runner-images/releases/tag/ubuntu24%2F20250907.24
2025-09-09T18:09:48.9034405Z ##[endgroup]
2025-09-09T18:09:48.9036223Z ##[group]GITHUB_TOKEN Permissions
2025-09-09T18:09:48.9039854Z Contents: read
2025-09-09T18:09:48.9040653Z Metadata: read
2025-09-09T18:09:48.9041452Z Packages: read
2025-09-09T18:09:48.9042332Z ##[endgroup]
2025-09-09T18:09:48.9045658Z Secret source: Actions
2025-09-09T18:09:48.9047123Z Prepare workflow directory
2025-09-09T18:09:48.9650424Z Prepare all required actions
2025-09-09T18:09:48.9746378Z Getting action download info
2025-09-09T18:09:49.3669586Z Download action repository 'actions/checkout@v4' (SHA:08eba0b27e820071cde6df949e0beb9ba4906955)
2025-09-09T18:09:49.4484623Z Download action repository 'actions/setup-node@v4' (SHA:49933ea5288caeca8642d1e84afbd3f7d6820020)
2025-09-09T18:09:49.5432937Z Download action repository 'actions/upload-artifact@v4' (SHA:ea165f8d65b6e75b540449e92b4886f43607fa02)
2025-09-09T18:09:49.6627711Z Download action repository 'actions/github-script@v7' (SHA:f28e40c7f34bde8b3046d885e986cb6290c5673b)
2025-09-09T18:09:49.9975278Z Complete job name: performance-audit
2025-09-09T18:09:50.0630432Z ##[group]Run actions/checkout@v4
2025-09-09T18:09:50.0631259Z with:
2025-09-09T18:09:50.0631700Z   repository: dj-pearson/project-profit-radar
2025-09-09T18:09:50.0632402Z   token: ***
2025-09-09T18:09:50.0632783Z   ssh-strict: true
2025-09-09T18:09:50.0633172Z   ssh-user: git
2025-09-09T18:09:50.0633579Z   persist-credentials: true
2025-09-09T18:09:50.0634020Z   clean: true
2025-09-09T18:09:50.0634422Z   sparse-checkout-cone-mode: true
2025-09-09T18:09:50.0634894Z   fetch-depth: 1
2025-09-09T18:09:50.0635279Z   fetch-tags: false
2025-09-09T18:09:50.0635676Z   show-progress: true
2025-09-09T18:09:50.0636075Z   lfs: false
2025-09-09T18:09:50.0636435Z   submodules: false
2025-09-09T18:09:50.0636839Z   set-safe-directory: true
2025-09-09T18:09:50.0637893Z ##[endgroup]
2025-09-09T18:09:50.1777822Z Syncing repository: dj-pearson/project-profit-radar
2025-09-09T18:09:50.1780822Z ##[group]Getting Git version info
2025-09-09T18:09:50.1782299Z Working directory is '/home/runner/work/project-profit-radar/project-profit-radar'
2025-09-09T18:09:50.1785139Z [command]/usr/bin/git version
2025-09-09T18:09:50.1825970Z git version 2.51.0
2025-09-09T18:09:50.1854749Z ##[endgroup]
2025-09-09T18:09:50.1871578Z Temporarily overriding HOME='/home/runner/work/_temp/744b1136-22d3-49ee-bb0d-d39e07b4a6d4' before making global git config changes
2025-09-09T18:09:50.1875404Z Adding repository directory to the temporary git global config as a safe directory
2025-09-09T18:09:50.1889223Z [command]/usr/bin/git config --global --add safe.directory /home/runner/work/project-profit-radar/project-profit-radar
2025-09-09T18:09:50.1927773Z Deleting the contents of '/home/runner/work/project-profit-radar/project-profit-radar'
2025-09-09T18:09:50.1932828Z ##[group]Initializing the repository
2025-09-09T18:09:50.1938344Z [command]/usr/bin/git init /home/runner/work/project-profit-radar/project-profit-radar
2025-09-09T18:09:50.2024884Z hint: Using 'master' as the name for the initial branch. This default branch name
2025-09-09T18:09:50.2027166Z hint: is subject to change. To configure the initial branch name to use in all
2025-09-09T18:09:50.2031191Z hint: of your new repositories, which will suppress this warning, call:
2025-09-09T18:09:50.2034057Z hint:
2025-09-09T18:09:50.2035106Z hint: 	git config --global init.defaultBranch <name>
2025-09-09T18:09:50.2036147Z hint:
2025-09-09T18:09:50.2037116Z hint: Names commonly chosen instead of 'master' are 'main', 'trunk' and
2025-09-09T18:09:50.2039149Z hint: 'development'. The just-created branch can be renamed via this command:
2025-09-09T18:09:50.2040423Z hint:
2025-09-09T18:09:50.2041076Z hint: 	git branch -m <name>
2025-09-09T18:09:50.2041795Z hint:
2025-09-09T18:09:50.2042742Z hint: Disable this message with "git config set advice.defaultBranchName false"
2025-09-09T18:09:50.2044564Z Initialized empty Git repository in /home/runner/work/project-profit-radar/project-profit-radar/.git/
2025-09-09T18:09:50.2047654Z [command]/usr/bin/git remote add origin https://github.com/dj-pearson/project-profit-radar
2025-09-09T18:09:50.2085857Z ##[endgroup]
2025-09-09T18:09:50.2086970Z ##[group]Disabling automatic garbage collection
2025-09-09T18:09:50.2087958Z [command]/usr/bin/git config --local gc.auto 0
2025-09-09T18:09:50.2117980Z ##[endgroup]
2025-09-09T18:09:50.2120861Z ##[group]Setting up auth
2025-09-09T18:09:50.2125381Z [command]/usr/bin/git config --local --name-only --get-regexp core\.sshCommand
2025-09-09T18:09:50.2159516Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'core\.sshCommand' && git config --local --unset-all 'core.sshCommand' || :"
2025-09-09T18:09:50.2440714Z [command]/usr/bin/git config --local --name-only --get-regexp http\.https\:\/\/github\.com\/\.extraheader
2025-09-09T18:09:50.2473673Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'http\.https\:\/\/github\.com\/\.extraheader' && git config --local --unset-all 'http.https://github.com/.extraheader' || :"
2025-09-09T18:09:50.2704835Z [command]/usr/bin/git config --local http.https://github.com/.extraheader AUTHORIZATION: basic ***
2025-09-09T18:09:50.2742052Z ##[endgroup]
2025-09-09T18:09:50.2744844Z ##[group]Fetching the repository
2025-09-09T18:09:50.2753177Z [command]/usr/bin/git -c protocol.version=2 fetch --no-tags --prune --no-recurse-submodules --depth=1 origin +893f48954e0af2c20a7a9e3966140714630609a5:refs/remotes/origin/main
2025-09-09T18:09:53.0055995Z From https://github.com/dj-pearson/project-profit-radar
2025-09-09T18:09:53.0058155Z  * [new ref]         893f48954e0af2c20a7a9e3966140714630609a5 -> origin/main
2025-09-09T18:09:53.0086921Z ##[endgroup]
2025-09-09T18:09:53.0089119Z ##[group]Determining the checkout info
2025-09-09T18:09:53.0093094Z ##[endgroup]
2025-09-09T18:09:53.0098883Z [command]/usr/bin/git sparse-checkout disable
2025-09-09T18:09:53.0144810Z [command]/usr/bin/git config --local --unset-all extensions.worktreeConfig
2025-09-09T18:09:53.0180057Z ##[group]Checking out the ref
2025-09-09T18:09:53.0182165Z [command]/usr/bin/git checkout --progress --force -B main refs/remotes/origin/main
2025-09-09T18:09:53.2563556Z Switched to a new branch 'main'
2025-09-09T18:09:53.2564166Z branch 'main' set up to track 'origin/main'.
2025-09-09T18:09:53.2604439Z ##[endgroup]
2025-09-09T18:09:53.2644379Z [command]/usr/bin/git log -1 --format=%H
2025-09-09T18:09:53.2668256Z 893f48954e0af2c20a7a9e3966140714630609a5
2025-09-09T18:09:53.2903852Z ##[group]Run actions/setup-node@v4
2025-09-09T18:09:53.2904207Z with:
2025-09-09T18:09:53.2904426Z   node-version: 18
2025-09-09T18:09:53.2904660Z   cache: npm
2025-09-09T18:09:53.2904868Z   always-auth: false
2025-09-09T18:09:53.2905114Z   check-latest: false
2025-09-09T18:09:53.2905492Z   token: ***
2025-09-09T18:09:53.2905714Z ##[endgroup]
2025-09-09T18:09:53.4777807Z Found in cache @ /opt/hostedtoolcache/node/18.20.8/x64
2025-09-09T18:09:53.4789234Z ##[group]Environment details
2025-09-09T18:09:55.1032883Z node: v18.20.8
2025-09-09T18:09:55.1035380Z npm: 10.8.2
2025-09-09T18:09:55.1036804Z yarn: 1.22.22
2025-09-09T18:09:55.1037980Z ##[endgroup]
2025-09-09T18:09:55.1062132Z [command]/opt/hostedtoolcache/node/18.20.8/x64/bin/npm config get cache
2025-09-09T18:09:55.3752241Z /home/runner/.npm
2025-09-09T18:09:55.5003627Z npm cache is not found
2025-09-09T18:09:55.5127596Z ##[group]Run npm ci
2025-09-09T18:09:55.5127876Z [36;1mnpm ci[0m
2025-09-09T18:09:55.5214973Z shell: /usr/bin/bash -e {0}
2025-09-09T18:09:55.5215239Z ##[endgroup]
2025-09-09T18:09:59.8160572Z npm warn EBADENGINE Unsupported engine {
2025-09-09T18:09:59.8165430Z npm warn EBADENGINE   package: '@capacitor/cli@7.4.2',
2025-09-09T18:09:59.8166264Z npm warn EBADENGINE   required: { node: '>=20.0.0' },
2025-09-09T18:09:59.8167109Z npm warn EBADENGINE   current: { node: 'v18.20.8', npm: '10.8.2' }
2025-09-09T18:09:59.8169540Z npm warn EBADENGINE }
2025-09-09T18:09:59.8170274Z npm warn EBADENGINE Unsupported engine {
2025-09-09T18:09:59.8171076Z npm warn EBADENGINE   package: '@isaacs/balanced-match@4.0.1',
2025-09-09T18:09:59.8171940Z npm warn EBADENGINE   required: { node: '20 || >=22' },
2025-09-09T18:09:59.8172777Z npm warn EBADENGINE   current: { node: 'v18.20.8', npm: '10.8.2' }
2025-09-09T18:09:59.8173434Z npm warn EBADENGINE }
2025-09-09T18:09:59.8174026Z npm warn EBADENGINE Unsupported engine {
2025-09-09T18:09:59.8174805Z npm warn EBADENGINE   package: '@isaacs/brace-expansion@5.0.0',
2025-09-09T18:09:59.8175625Z npm warn EBADENGINE   required: { node: '20 || >=22' },
2025-09-09T18:09:59.8176466Z npm warn EBADENGINE   current: { node: 'v18.20.8', npm: '10.8.2' }
2025-09-09T18:09:59.8177088Z npm warn EBADENGINE }
2025-09-09T18:09:59.8181712Z npm warn EBADENGINE Unsupported engine {
2025-09-09T18:09:59.8183023Z npm warn EBADENGINE   package: 'commander@14.0.0',
2025-09-09T18:09:59.8186058Z npm warn EBADENGINE   required: { node: '>=20' },
2025-09-09T18:09:59.8186886Z npm warn EBADENGINE   current: { node: 'v18.20.8', npm: '10.8.2' }
2025-09-09T18:09:59.8187560Z npm warn EBADENGINE }
2025-09-09T18:09:59.8201527Z npm warn EBADENGINE Unsupported engine {
2025-09-09T18:09:59.8202868Z npm warn EBADENGINE   package: 'eventsource-parser@3.0.5',
2025-09-09T18:09:59.8205817Z npm warn EBADENGINE   required: { node: '>=20.0.0' },
2025-09-09T18:09:59.8214521Z npm warn EBADENGINE   current: { node: 'v18.20.8', npm: '10.8.2' }
2025-09-09T18:09:59.8215222Z npm warn EBADENGINE }
2025-09-09T18:09:59.8215821Z npm warn EBADENGINE Unsupported engine {
2025-09-09T18:09:59.8216535Z npm warn EBADENGINE   package: 'glob@11.0.3',
2025-09-09T18:09:59.8217217Z npm warn EBADENGINE   required: { node: '20 || >=22' },
2025-09-09T18:09:59.8217994Z npm warn EBADENGINE   current: { node: 'v18.20.8', npm: '10.8.2' }
2025-09-09T18:09:59.8219490Z npm warn EBADENGINE }
2025-09-09T18:09:59.8220057Z npm warn EBADENGINE Unsupported engine {
2025-09-09T18:09:59.8220763Z npm warn EBADENGINE   package: 'minimatch@10.0.3',
2025-09-09T18:09:59.8221532Z npm warn EBADENGINE   required: { node: '20 || >=22' },
2025-09-09T18:09:59.8222385Z npm warn EBADENGINE   current: { node: 'v18.20.8', npm: '10.8.2' }
2025-09-09T18:09:59.8223007Z npm warn EBADENGINE }
2025-09-09T18:09:59.8228884Z npm warn EBADENGINE Unsupported engine {
2025-09-09T18:09:59.8229636Z npm warn EBADENGINE   package: 'jackspeak@4.1.1',
2025-09-09T18:09:59.8230407Z npm warn EBADENGINE   required: { node: '20 || >=22' },
2025-09-09T18:09:59.8231236Z npm warn EBADENGINE   current: { node: 'v18.20.8', npm: '10.8.2' }
2025-09-09T18:09:59.8231896Z npm warn EBADENGINE }
2025-09-09T18:09:59.8234069Z npm warn EBADENGINE Unsupported engine {
2025-09-09T18:09:59.8234873Z npm warn EBADENGINE   package: 'path-scurry@2.0.0',
2025-09-09T18:09:59.8235649Z npm warn EBADENGINE   required: { node: '20 || >=22' },
2025-09-09T18:09:59.8236473Z npm warn EBADENGINE   current: { node: 'v18.20.8', npm: '10.8.2' }
2025-09-09T18:09:59.8237091Z npm warn EBADENGINE }
2025-09-09T18:09:59.8237599Z npm warn EBADENGINE Unsupported engine {
2025-09-09T18:09:59.8238249Z npm warn EBADENGINE   package: 'lru-cache@11.1.0',
2025-09-09T18:09:59.8239570Z npm warn EBADENGINE   required: { node: '20 || >=22' },
2025-09-09T18:09:59.8240424Z npm warn EBADENGINE   current: { node: 'v18.20.8', npm: '10.8.2' }
2025-09-09T18:09:59.8241054Z npm warn EBADENGINE }
2025-09-09T18:09:59.8243761Z npm warn EBADENGINE Unsupported engine {
2025-09-09T18:09:59.8246448Z npm warn EBADENGINE   package: 'rimraf@6.0.1',
2025-09-09T18:09:59.8247193Z npm warn EBADENGINE   required: { node: '20 || >=22' },
2025-09-09T18:09:59.8248006Z npm warn EBADENGINE   current: { node: 'v18.20.8', npm: '10.8.2' }
2025-09-09T18:09:59.8248866Z npm warn EBADENGINE }
2025-09-09T18:09:59.8407431Z npm error code EUSAGE
2025-09-09T18:09:59.8409344Z npm error
2025-09-09T18:09:59.8412197Z npm error `npm ci` can only install packages when your package.json and package-lock.json or npm-shrinkwrap.json are in sync. Please update your lock file with `npm install` before continuing.
2025-09-09T18:09:59.8414561Z npm error
2025-09-09T18:09:59.8415295Z npm error Missing: @rollup/rollup-android-arm-eabi@4.50.0 from lock file
2025-09-09T18:09:59.8416319Z npm error Missing: @rollup/rollup-android-arm64@4.50.0 from lock file
2025-09-09T18:09:59.8417302Z npm error Missing: @rollup/rollup-darwin-arm64@4.50.0 from lock file
2025-09-09T18:09:59.8418265Z npm error Missing: @rollup/rollup-darwin-x64@4.50.0 from lock file
2025-09-09T18:09:59.8419466Z npm error Missing: @rollup/rollup-freebsd-arm64@4.50.0 from lock file
2025-09-09T18:09:59.8420925Z npm error Missing: @rollup/rollup-freebsd-x64@4.50.0 from lock file
2025-09-09T18:09:59.8422015Z npm error Missing: @rollup/rollup-linux-arm-gnueabihf@4.50.0 from lock file
2025-09-09T18:09:59.8423414Z npm error Missing: @rollup/rollup-linux-arm-musleabihf@4.50.0 from lock file
2025-09-09T18:09:59.8424461Z npm error Missing: @rollup/rollup-linux-arm64-gnu@4.50.0 from lock file
2025-09-09T18:09:59.8425814Z npm error Missing: @rollup/rollup-linux-arm64-musl@4.50.0 from lock file
2025-09-09T18:09:59.8426813Z npm error Missing: @rollup/rollup-linux-loongarch64-gnu@4.50.0 from lock file
2025-09-09T18:09:59.8427700Z npm error Missing: @rollup/rollup-linux-riscv64-gnu@4.50.0 from lock file
2025-09-09T18:09:59.8428733Z npm error Missing: @rollup/rollup-linux-riscv64-musl@4.50.0 from lock file
2025-09-09T18:09:59.8429623Z npm error Missing: @rollup/rollup-linux-s390x-gnu@4.50.0 from lock file
2025-09-09T18:09:59.8430455Z npm error Missing: @rollup/rollup-linux-x64-gnu@4.50.0 from lock file
2025-09-09T18:09:59.8431236Z npm error Missing: @rollup/rollup-linux-x64-musl@4.50.0 from lock file
2025-09-09T18:09:59.8432017Z npm error Missing: @rollup/rollup-win32-arm64-msvc@4.50.0 from lock file
2025-09-09T18:09:59.8432849Z npm error Missing: @rollup/rollup-win32-ia32-msvc@4.50.0 from lock file
2025-09-09T18:09:59.8433672Z npm error Missing: @rollup/rollup-win32-x64-msvc@4.50.0 from lock file
2025-09-09T18:09:59.8434165Z npm error
2025-09-09T18:09:59.8434509Z npm error Clean install a project
2025-09-09T18:09:59.8434950Z npm error
2025-09-09T18:09:59.8435245Z npm error Usage:
2025-09-09T18:09:59.8435545Z npm error npm ci
2025-09-09T18:09:59.8435800Z npm error
2025-09-09T18:09:59.8436102Z npm error Options:
2025-09-09T18:09:59.8436824Z npm error [--install-strategy <hoisted|nested|shallow|linked>] [--legacy-bundling]
2025-09-09T18:09:59.8437890Z npm error [--global-style] [--omit <dev|optional|peer> [--omit <dev|optional|peer> ...]]
2025-09-09T18:09:59.8439122Z npm error [--include <prod|dev|optional|peer> [--include <prod|dev|optional|peer> ...]]
2025-09-09T18:09:59.8440181Z npm error [--strict-peer-deps] [--foreground-scripts] [--ignore-scripts] [--no-audit]
2025-09-09T18:09:59.8440988Z npm error [--no-bin-links] [--no-fund] [--dry-run]
2025-09-09T18:09:59.8441821Z npm error [-w|--workspace <workspace-name> [-w|--workspace <workspace-name> ...]]
2025-09-09T18:09:59.8442752Z npm error [-ws|--workspaces] [--include-workspace-root] [--install-links]
2025-09-09T18:09:59.8443329Z npm error
2025-09-09T18:09:59.8443895Z npm error aliases: clean-install, ic, install-clean, isntall-clean
2025-09-09T18:09:59.8444739Z npm error
2025-09-09T18:09:59.8445143Z npm error Run "npm help ci" for more info
2025-09-09T18:09:59.8446719Z npm error A complete log of this run can be found in: /home/runner/.npm/_logs/2025-09-09T18_09_55_597Z-debug-0.log
2025-09-09T18:09:59.8533658Z ##[error]Process completed with exit code 1.
2025-09-09T18:09:59.8616171Z ##[group]Run actions/upload-artifact@v4
2025-09-09T18:09:59.8616451Z with:
2025-09-09T18:09:59.8616635Z   name: performance-reports
2025-09-09T18:09:59.8616885Z   path: performance-*.json
dist/stats.html

2025-09-09T18:09:59.8617136Z   retention-days: 30
2025-09-09T18:09:59.8617339Z   if-no-files-found: warn
2025-09-09T18:09:59.8617540Z   compression-level: 6
2025-09-09T18:09:59.8617726Z   overwrite: false
2025-09-09T18:09:59.8617908Z   include-hidden-files: false
2025-09-09T18:09:59.8618119Z ##[endgroup]
2025-09-09T18:10:00.0907242Z ##[warning]No files were found with the provided path: performance-*.json
dist/stats.html. No artifacts will be uploaded.
2025-09-09T18:10:00.1048840Z Post job cleanup.
2025-09-09T18:10:00.2013490Z [command]/usr/bin/git version
2025-09-09T18:10:00.2055054Z git version 2.51.0
2025-09-09T18:10:00.2101118Z Temporarily overriding HOME='/home/runner/work/_temp/27e8260a-c4ef-455f-bff3-7c177286cb61' before making global git config changes
2025-09-09T18:10:00.2103565Z Adding repository directory to the temporary git global config as a safe directory
2025-09-09T18:10:00.2108209Z [command]/usr/bin/git config --global --add safe.directory /home/runner/work/project-profit-radar/project-profit-radar
2025-09-09T18:10:00.2155069Z [command]/usr/bin/git config --local --name-only --get-regexp core\.sshCommand
2025-09-09T18:10:00.2191159Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'core\.sshCommand' && git config --local --unset-all 'core.sshCommand' || :"
2025-09-09T18:10:00.2555948Z [command]/usr/bin/git config --local --name-only --get-regexp http\.https\:\/\/github\.com\/\.extraheader
2025-09-09T18:10:00.2601115Z http.https://github.com/.extraheader
2025-09-09T18:10:00.2624875Z [command]/usr/bin/git config --local --unset-all http.https://github.com/.extraheader
2025-09-09T18:10:00.2680141Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'http\.https\:\/\/github\.com\/\.extraheader' && git config --local --unset-all 'http.https://github.com/.extraheader' || :"
2025-09-09T18:10:00.3186845Z Cleaning up orphan processes
Apollo
