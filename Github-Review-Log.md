2025-09-09T17:48:15.7593366Z Current runner version: '2.328.0'
2025-09-09T17:48:15.7628285Z ##[group]Runner Image Provisioner
2025-09-09T17:48:15.7629564Z Hosted Compute Agent
2025-09-09T17:48:15.7630441Z Version: 20250908.385
2025-09-09T17:48:15.7631333Z Commit: cfce01a78eb650f23de9981e2e79cb8dc83e6056
2025-09-09T17:48:15.7632526Z Build Date: 2025-09-08T16:07:37Z
2025-09-09T17:48:15.7633465Z ##[endgroup]
2025-09-09T17:48:15.7634322Z ##[group]Operating System
2025-09-09T17:48:15.7635146Z Ubuntu
2025-09-09T17:48:15.7636032Z 24.04.3
2025-09-09T17:48:15.7637033Z LTS
2025-09-09T17:48:15.7637764Z ##[endgroup]
2025-09-09T17:48:15.7638764Z ##[group]Runner Image
2025-09-09T17:48:15.7639802Z Image: ubuntu-24.04
2025-09-09T17:48:15.7640696Z Version: 20250907.24.1
2025-09-09T17:48:15.7642588Z Included Software: https://github.com/actions/runner-images/blob/ubuntu24/20250907.24/images/ubuntu/Ubuntu2404-Readme.md
2025-09-09T17:48:15.7645457Z Image Release: https://github.com/actions/runner-images/releases/tag/ubuntu24%2F20250907.24
2025-09-09T17:48:15.7647589Z ##[endgroup]
2025-09-09T17:48:15.7649465Z ##[group]GITHUB_TOKEN Permissions
2025-09-09T17:48:15.7652049Z Contents: read
2025-09-09T17:48:15.7652876Z Metadata: read
2025-09-09T17:48:15.7653699Z Packages: read
2025-09-09T17:48:15.7654589Z ##[endgroup]
2025-09-09T17:48:15.7657795Z Secret source: Actions
2025-09-09T17:48:15.7658876Z Prepare workflow directory
2025-09-09T17:48:15.8326368Z Prepare all required actions
2025-09-09T17:48:15.8383610Z Getting action download info
2025-09-09T17:48:16.4004899Z Download action repository 'actions/checkout@v4' (SHA:08eba0b27e820071cde6df949e0beb9ba4906955)
2025-09-09T17:48:16.5915798Z Download action repository 'actions/setup-node@v4' (SHA:49933ea5288caeca8642d1e84afbd3f7d6820020)
2025-09-09T17:48:16.6880506Z Download action repository 'actions/upload-artifact@v4' (SHA:ea165f8d65b6e75b540449e92b4886f43607fa02)
2025-09-09T17:48:16.8075768Z Download action repository 'actions/github-script@v7' (SHA:f28e40c7f34bde8b3046d885e986cb6290c5673b)
2025-09-09T17:48:17.7361924Z Complete job name: performance-audit
2025-09-09T17:48:17.8054990Z ##[group]Run actions/checkout@v4
2025-09-09T17:48:17.8055889Z with:
2025-09-09T17:48:17.8056375Z   repository: dj-pearson/project-profit-radar
2025-09-09T17:48:17.8057599Z   token: ***
2025-09-09T17:48:17.8058016Z   ssh-strict: true
2025-09-09T17:48:17.8058451Z   ssh-user: git
2025-09-09T17:48:17.8058880Z   persist-credentials: true
2025-09-09T17:48:17.8059358Z   clean: true
2025-09-09T17:48:17.8059781Z   sparse-checkout-cone-mode: true
2025-09-09T17:48:17.8060298Z   fetch-depth: 1
2025-09-09T17:48:17.8060712Z   fetch-tags: false
2025-09-09T17:48:17.8061135Z   show-progress: true
2025-09-09T17:48:17.8061566Z   lfs: false
2025-09-09T17:48:17.8061970Z   submodules: false
2025-09-09T17:48:17.8062425Z   set-safe-directory: true
2025-09-09T17:48:17.8063221Z ##[endgroup]
2025-09-09T17:48:17.9195049Z Syncing repository: dj-pearson/project-profit-radar
2025-09-09T17:48:17.9197620Z ##[group]Getting Git version info
2025-09-09T17:48:17.9199476Z Working directory is '/home/runner/work/project-profit-radar/project-profit-radar'
2025-09-09T17:48:17.9201799Z [command]/usr/bin/git version
2025-09-09T17:48:17.9279797Z git version 2.51.0
2025-09-09T17:48:17.9305609Z ##[endgroup]
2025-09-09T17:48:17.9320401Z Temporarily overriding HOME='/home/runner/work/_temp/33ed679b-2645-4a25-88ef-87c8ff8996aa' before making global git config changes
2025-09-09T17:48:17.9324569Z Adding repository directory to the temporary git global config as a safe directory
2025-09-09T17:48:17.9338238Z [command]/usr/bin/git config --global --add safe.directory /home/runner/work/project-profit-radar/project-profit-radar
2025-09-09T17:48:17.9407840Z Deleting the contents of '/home/runner/work/project-profit-radar/project-profit-radar'
2025-09-09T17:48:17.9410046Z ##[group]Initializing the repository
2025-09-09T17:48:17.9411591Z [command]/usr/bin/git init /home/runner/work/project-profit-radar/project-profit-radar
2025-09-09T17:48:17.9485413Z hint: Using 'master' as the name for the initial branch. This default branch name
2025-09-09T17:48:17.9488551Z hint: is subject to change. To configure the initial branch name to use in all
2025-09-09T17:48:17.9491837Z hint: of your new repositories, which will suppress this warning, call:
2025-09-09T17:48:17.9494032Z hint:
2025-09-09T17:48:17.9495034Z hint: 	git config --global init.defaultBranch <name>
2025-09-09T17:48:17.9496185Z hint:
2025-09-09T17:48:17.9497536Z hint: Names commonly chosen instead of 'master' are 'main', 'trunk' and
2025-09-09T17:48:17.9499350Z hint: 'development'. The just-created branch can be renamed via this command:
2025-09-09T17:48:17.9500768Z hint:
2025-09-09T17:48:17.9501490Z hint: 	git branch -m <name>
2025-09-09T17:48:17.9502689Z hint:
2025-09-09T17:48:17.9503937Z hint: Disable this message with "git config set advice.defaultBranchName false"
2025-09-09T17:48:17.9507546Z Initialized empty Git repository in /home/runner/work/project-profit-radar/project-profit-radar/.git/
2025-09-09T17:48:17.9510849Z [command]/usr/bin/git remote add origin https://github.com/dj-pearson/project-profit-radar
2025-09-09T17:48:17.9561973Z ##[endgroup]
2025-09-09T17:48:17.9565278Z ##[group]Disabling automatic garbage collection
2025-09-09T17:48:17.9568494Z [command]/usr/bin/git config --local gc.auto 0
2025-09-09T17:48:17.9601985Z ##[endgroup]
2025-09-09T17:48:17.9603519Z ##[group]Setting up auth
2025-09-09T17:48:17.9605129Z [command]/usr/bin/git config --local --name-only --get-regexp core\.sshCommand
2025-09-09T17:48:17.9638904Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'core\.sshCommand' && git config --local --unset-all 'core.sshCommand' || :"
2025-09-09T17:48:17.9964382Z [command]/usr/bin/git config --local --name-only --get-regexp http\.https\:\/\/github\.com\/\.extraheader
2025-09-09T17:48:17.9998654Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'http\.https\:\/\/github\.com\/\.extraheader' && git config --local --unset-all 'http.https://github.com/.extraheader' || :"
2025-09-09T17:48:18.0235928Z [command]/usr/bin/git config --local http.https://github.com/.extraheader AUTHORIZATION: basic ***
2025-09-09T17:48:18.0273679Z ##[endgroup]
2025-09-09T17:48:18.0276808Z ##[group]Fetching the repository
2025-09-09T17:48:18.0286258Z [command]/usr/bin/git -c protocol.version=2 fetch --no-tags --prune --no-recurse-submodules --depth=1 origin +7c99e3b3528a5543d3afac1bcc76b2b92f7b93b0:refs/remotes/origin/main
2025-09-09T17:48:21.3564031Z From https://github.com/dj-pearson/project-profit-radar
2025-09-09T17:48:21.3565156Z  * [new ref]         7c99e3b3528a5543d3afac1bcc76b2b92f7b93b0 -> origin/main
2025-09-09T17:48:21.3592103Z ##[endgroup]
2025-09-09T17:48:21.3594429Z ##[group]Determining the checkout info
2025-09-09T17:48:21.3595217Z ##[endgroup]
2025-09-09T17:48:21.3599271Z [command]/usr/bin/git sparse-checkout disable
2025-09-09T17:48:21.3641180Z [command]/usr/bin/git config --local --unset-all extensions.worktreeConfig
2025-09-09T17:48:21.3671544Z ##[group]Checking out the ref
2025-09-09T17:48:21.3675385Z [command]/usr/bin/git checkout --progress --force -B main refs/remotes/origin/main
2025-09-09T17:48:21.5933265Z Switched to a new branch 'main'
2025-09-09T17:48:21.5934165Z branch 'main' set up to track 'origin/main'.
2025-09-09T17:48:21.5970882Z ##[endgroup]
2025-09-09T17:48:21.6013391Z [command]/usr/bin/git log -1 --format=%H
2025-09-09T17:48:21.6037671Z 7c99e3b3528a5543d3afac1bcc76b2b92f7b93b0
2025-09-09T17:48:21.6273669Z ##[group]Run actions/setup-node@v4
2025-09-09T17:48:21.6273988Z with:
2025-09-09T17:48:21.6274168Z   node-version: 18
2025-09-09T17:48:21.6274349Z   cache: npm
2025-09-09T17:48:21.6274517Z   always-auth: false
2025-09-09T17:48:21.6274723Z   check-latest: false
2025-09-09T17:48:21.6275028Z   token: ***
2025-09-09T17:48:21.6275204Z ##[endgroup]
2025-09-09T17:48:21.8188803Z Found in cache @ /opt/hostedtoolcache/node/18.20.8/x64
2025-09-09T17:48:21.8193810Z ##[group]Environment details
2025-09-09T17:48:24.7967906Z node: v18.20.8
2025-09-09T17:48:24.7969139Z npm: 10.8.2
2025-09-09T17:48:24.7969435Z yarn: 1.22.22
2025-09-09T17:48:24.7970914Z ##[endgroup]
2025-09-09T17:48:24.7993118Z [command]/opt/hostedtoolcache/node/18.20.8/x64/bin/npm config get cache
2025-09-09T17:48:25.1689911Z /home/runner/.npm
2025-09-09T17:48:25.4675743Z npm cache is not found
2025-09-09T17:48:25.4794767Z ##[group]Run npm ci
2025-09-09T17:48:25.4795024Z [36;1mnpm ci[0m
2025-09-09T17:48:25.4978783Z shell: /usr/bin/bash -e {0}
2025-09-09T17:48:25.4979089Z ##[endgroup]
2025-09-09T17:48:30.1220342Z npm warn EBADENGINE Unsupported engine {
2025-09-09T17:48:30.1225466Z npm warn EBADENGINE   package: '@capacitor/cli@7.4.3',
2025-09-09T17:48:30.1230315Z npm warn EBADENGINE   required: { node: '>=20.0.0' },
2025-09-09T17:48:30.1235050Z npm warn EBADENGINE   current: { node: 'v18.20.8', npm: '10.8.2' }
2025-09-09T17:48:30.1239735Z npm warn EBADENGINE }
2025-09-09T17:48:30.1244199Z npm warn EBADENGINE Unsupported engine {
2025-09-09T17:48:30.1249190Z npm warn EBADENGINE   package: '@isaacs/balanced-match@4.0.1',
2025-09-09T17:48:30.1254001Z npm warn EBADENGINE   required: { node: '20 || >=22' },
2025-09-09T17:48:30.1258527Z npm warn EBADENGINE   current: { node: 'v18.20.8', npm: '10.8.2' }
2025-09-09T17:48:30.1261458Z npm warn EBADENGINE }
2025-09-09T17:48:30.1264346Z npm warn EBADENGINE Unsupported engine {
2025-09-09T17:48:30.1268773Z npm warn EBADENGINE   package: '@isaacs/brace-expansion@5.0.0',
2025-09-09T17:48:30.1269604Z npm warn EBADENGINE   required: { node: '20 || >=22' },
2025-09-09T17:48:30.1270430Z npm warn EBADENGINE   current: { node: 'v18.20.8', npm: '10.8.2' }
2025-09-09T17:48:30.1271385Z npm warn EBADENGINE }
2025-09-09T17:48:30.1272245Z npm warn EBADENGINE Unsupported engine {
2025-09-09T17:48:30.1273258Z npm warn EBADENGINE   package: 'commander@14.0.0',
2025-09-09T17:48:30.1280171Z npm warn EBADENGINE   required: { node: '>=20' },
2025-09-09T17:48:30.1280985Z npm warn EBADENGINE   current: { node: 'v18.20.8', npm: '10.8.2' }
2025-09-09T17:48:30.1281627Z npm warn EBADENGINE }
2025-09-09T17:48:30.1282236Z npm warn EBADENGINE Unsupported engine {
2025-09-09T17:48:30.1282906Z npm warn EBADENGINE   package: 'glob@11.0.3',
2025-09-09T17:48:30.1287784Z npm warn EBADENGINE   required: { node: '20 || >=22' },
2025-09-09T17:48:30.1288642Z npm warn EBADENGINE   current: { node: 'v18.20.8', npm: '10.8.2' }
2025-09-09T17:48:30.1289248Z npm warn EBADENGINE }
2025-09-09T17:48:30.1289725Z npm warn EBADENGINE Unsupported engine {
2025-09-09T17:48:30.1290391Z npm warn EBADENGINE   package: 'minimatch@10.0.3',
2025-09-09T17:48:30.1291107Z npm warn EBADENGINE   required: { node: '20 || >=22' },
2025-09-09T17:48:30.1291911Z npm warn EBADENGINE   current: { node: 'v18.20.8', npm: '10.8.2' }
2025-09-09T17:48:30.1292545Z npm warn EBADENGINE }
2025-09-09T17:48:30.1293169Z npm warn EBADENGINE Unsupported engine {
2025-09-09T17:48:30.1293791Z npm warn EBADENGINE   package: 'jackspeak@4.1.1',
2025-09-09T17:48:30.1294507Z npm warn EBADENGINE   required: { node: '20 || >=22' },
2025-09-09T17:48:30.1295361Z npm warn EBADENGINE   current: { node: 'v18.20.8', npm: '10.8.2' }
2025-09-09T17:48:30.1298397Z npm warn EBADENGINE }
2025-09-09T17:48:30.1298934Z npm warn EBADENGINE Unsupported engine {
2025-09-09T17:48:30.1299609Z npm warn EBADENGINE   package: 'path-scurry@2.0.0',
2025-09-09T17:48:30.1300375Z npm warn EBADENGINE   required: { node: '20 || >=22' },
2025-09-09T17:48:30.1301195Z npm warn EBADENGINE   current: { node: 'v18.20.8', npm: '10.8.2' }
2025-09-09T17:48:30.1301817Z npm warn EBADENGINE }
2025-09-09T17:48:30.1302930Z npm warn EBADENGINE Unsupported engine {
2025-09-09T17:48:30.1303883Z npm warn EBADENGINE   package: 'lru-cache@11.2.1',
2025-09-09T17:48:30.1304901Z npm warn EBADENGINE   required: { node: '20 || >=22' },
2025-09-09T17:48:30.1317577Z npm warn EBADENGINE   current: { node: 'v18.20.8', npm: '10.8.2' }
2025-09-09T17:48:30.1320151Z npm warn EBADENGINE }
2025-09-09T17:48:30.1320690Z npm warn EBADENGINE Unsupported engine {
2025-09-09T17:48:30.1321340Z npm warn EBADENGINE   package: 'rimraf@6.0.1',
2025-09-09T17:48:30.1322459Z npm warn EBADENGINE   required: { node: '20 || >=22' },
2025-09-09T17:48:30.1323287Z npm warn EBADENGINE   current: { node: 'v18.20.8', npm: '10.8.2' }
2025-09-09T17:48:30.1323915Z npm warn EBADENGINE }
2025-09-09T17:48:34.3310472Z npm warn deprecated puppeteer@23.11.1: < 24.9.0 is no longer supported
2025-09-09T17:48:36.9150342Z npm warn deprecated @modelcontextprotocol/server-puppeteer@2025.5.12: Package no longer supported. Contact Support at https://www.npmjs.com/support for more info.
2025-09-09T17:48:51.3219381Z 
2025-09-09T17:48:51.3220199Z added 808 packages in 26s
2025-09-09T17:48:51.3533490Z ##[group]Run npm run build
2025-09-09T17:48:51.3533760Z [36;1mnpm run build[0m
2025-09-09T17:48:51.3563478Z shell: /usr/bin/bash -e {0}
2025-09-09T17:48:51.3563715Z ##[endgroup]
2025-09-09T17:48:51.5020881Z 
2025-09-09T17:48:51.5021378Z > builddesk@0.0.0 build
2025-09-09T17:48:51.5022043Z > npm run generate-sitemap && vite build
2025-09-09T17:48:51.5022396Z 
2025-09-09T17:48:51.6690849Z 
2025-09-09T17:48:51.6692744Z > builddesk@0.0.0 generate-sitemap
2025-09-09T17:48:51.6694658Z > node scripts/generate-sitemap.js
2025-09-09T17:48:51.6695547Z 
2025-09-09T17:48:51.7067001Z ✅ Sitemap generated: /home/runner/work/project-profit-radar/project-profit-radar/public/sitemap.xml
2025-09-09T17:48:51.7082202Z 📊 Total pages: 41
2025-09-09T17:48:51.7083537Z 📅 Last modified: 2025-09-09
2025-09-09T17:48:51.9946103Z [36mvite v5.4.19 [32mbuilding for production...[36m[39m
2025-09-09T17:48:52.3170950Z transforming...
2025-09-09T17:49:09.4624681Z [32m✓[39m 4388 modules transformed.
2025-09-09T17:49:10.6357923Z rendering chunks...
2025-09-09T17:49:11.6478567Z [1m[33m[plugin:vite:reporter][39m[22m [33m[plugin vite:reporter] 
2025-09-09T17:49:11.6484385Z (!) /home/runner/work/project-profit-radar/project-profit-radar/src/utils/pdfExportUtils.ts is dynamically imported by /home/runner/work/project-profit-radar/project-profit-radar/src/components/schedule/GanttChart.tsx but also statically imported by /home/runner/work/project-profit-radar/project-profit-radar/src/components/schedule/PDFExportDialog.tsx, dynamic import will not move module into another chunk.
2025-09-09T17:49:11.6489115Z [39m
2025-09-09T17:49:27.3742244Z computing gzip size...
2025-09-09T17:49:27.4596005Z [2mdist/[22m[32mindex.html                             [39m[1m[2m    7.46 kB[22m[1m[22m[2m │ gzip:   2.16 kB[22m
2025-09-09T17:49:27.4613229Z [2mdist/[22m[2massets/[22m[35mindex-CTWCRSou.css              [39m[1m[2m  113.32 kB[22m[1m[22m[2m │ gzip:  18.32 kB[22m
2025-09-09T17:49:27.4619651Z [2mdist/[22m[2massets/[22m[36mchunk-CYUaZPjH.js               [39m[1m[2m    3.62 kB[22m[1m[22m[2m │ gzip:   1.52 kB[22m
2025-09-09T17:49:27.4621168Z [2mdist/[22m[2massets/[22m[36mIndustries-Cg4XKD8P.js          [39m[1m[2m    4.34 kB[22m[1m[22m[2m │ gzip:   1.69 kB[22m
2025-09-09T17:49:27.4622637Z [2mdist/[22m[2massets/[22m[36mchunk-B-Zdp_1r.js               [39m[1m[2m   14.76 kB[22m[1m[22m[2m │ gzip:   4.95 kB[22m
2025-09-09T17:49:27.4624145Z [2mdist/[22m[2massets/[22m[36mchunk-u1TwxFmX.js               [39m[1m[2m   18.28 kB[22m[1m[22m[2m │ gzip:   6.14 kB[22m
2025-09-09T17:49:27.4625576Z [2mdist/[22m[2massets/[22m[36mchunk--BulIq_u.js               [39m[1m[2m   20.90 kB[22m[1m[22m[2m │ gzip:   7.11 kB[22m
2025-09-09T17:49:27.4627241Z [2mdist/[22m[2massets/[22m[36mchunk-CV0HJCKZ.js               [39m[1m[2m   21.96 kB[22m[1m[22m[2m │ gzip:   8.13 kB[22m
2025-09-09T17:49:27.4628481Z [2mdist/[22m[2massets/[22m[36mchunk-D0KbzZle.js               [39m[1m[2m   24.26 kB[22m[1m[22m[2m │ gzip:   8.40 kB[22m
2025-09-09T17:49:27.4629891Z [2mdist/[22m[2massets/[22m[36mchunk-DaKkABg9.js               [39m[1m[2m   28.03 kB[22m[1m[22m[2m │ gzip:   8.15 kB[22m
2025-09-09T17:49:27.4631283Z [2mdist/[22m[2massets/[22m[36mchunk-DQRBBuxS.js               [39m[1m[2m   82.12 kB[22m[1m[22m[2m │ gzip:  27.88 kB[22m
2025-09-09T17:49:27.4633164Z [2mdist/[22m[2massets/[22m[36mchunk-DAgR2_I8.js               [39m[1m[2m   83.83 kB[22m[1m[22m[2m │ gzip:  23.20 kB[22m
2025-09-09T17:49:27.4634617Z [2mdist/[22m[2massets/[22m[36mchunk-DCNTxinz.js               [39m[1m[2m  123.00 kB[22m[1m[22m[2m │ gzip:  33.95 kB[22m
2025-09-09T17:49:27.4635991Z [2mdist/[22m[2massets/[22m[36mchunk-CJn4vBP-.js               [39m[1m[2m  141.86 kB[22m[1m[22m[2m │ gzip:  45.59 kB[22m
2025-09-09T17:49:27.4637905Z [2mdist/[22m[2massets/[22m[36mindex.es.js-CGFVHDJ_.js         [39m[1m[2m  150.47 kB[22m[1m[22m[2m │ gzip:  51.41 kB[22m
2025-09-09T17:49:27.4639337Z [2mdist/[22m[2massets/[22m[36mhtml2canvas.esm.js-BfxBtG_O.js  [39m[1m[2m  201.41 kB[22m[1m[22m[2m │ gzip:  48.03 kB[22m
2025-09-09T17:49:27.4640709Z [2mdist/[22m[2massets/[22m[36mchunk-B0WWTYqB.js               [39m[1m[2m  444.32 kB[22m[1m[22m[2m │ gzip: 116.33 kB[22m
2025-09-09T17:49:27.4642005Z [2mdist/[22m[2massets/[22m[36mchunk-DcmTdkuJ.js               [39m[1m[33m  703.43 kB[39m[22m[2m │ gzip: 231.73 kB[22m
2025-09-09T17:49:27.4643314Z [2mdist/[22m[2massets/[22m[36mindex-D9BrSNg4.js               [39m[1m[33m2,746.06 kB[39m[22m[2m │ gzip: 574.18 kB[22m
2025-09-09T17:49:27.4644090Z [32m✓ built in 35.44s[39m
2025-09-09T17:49:27.4667457Z [33m
2025-09-09T17:49:27.4668044Z (!) Some chunks are larger than 500 kB after minification. Consider:
2025-09-09T17:49:27.4668787Z - Using dynamic import() to code-split the application
2025-09-09T17:49:27.4670103Z - Use build.rollupOptions.output.manualChunks to improve chunking: https://rollupjs.org/configuration-options/#output-manualchunks
2025-09-09T17:49:27.4671516Z - Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.[39m
2025-09-09T17:49:27.6059073Z ##[group]Run npm run performance:budget
2025-09-09T17:49:27.6059612Z [36;1mnpm run performance:budget[0m
2025-09-09T17:49:27.6090358Z shell: /usr/bin/bash -e {0}
2025-09-09T17:49:27.6090607Z ##[endgroup]
2025-09-09T17:49:27.7399514Z 
2025-09-09T17:49:27.7400146Z > builddesk@0.0.0 performance:budget
2025-09-09T17:49:27.7400837Z > node scripts/check-performance-budget.js
2025-09-09T17:49:27.7401195Z 
2025-09-09T17:49:27.7772009Z 🚀 BuildDesk Performance Budget Check
2025-09-09T17:49:27.7776493Z =====================================
2025-09-09T17:49:27.7778307Z 
2025-09-09T17:49:27.7781936Z 📦 Bundle Size Analysis
2025-09-09T17:49:27.7783596Z ========================================
2025-09-09T17:49:27.7793239Z   ✅ android-chrome-512x512.png: 138.9KB
2025-09-09T17:49:27.7797896Z   ✅ assets/chunk-B0WWTYqB.js: 433.9KB
2025-09-09T17:49:27.7799405Z   ✅ assets/chunk-CJn4vBP-.js: 138.5KB
2025-09-09T17:49:27.7802212Z   ✅ assets/chunk-DAgR2_I8.js: 81.9KB
2025-09-09T17:49:27.7803254Z   ✅ assets/chunk-DCNTxinz.js: 120.1KB
2025-09-09T17:49:27.7806114Z   ✅ assets/chunk-DQRBBuxS.js: 80.2KB
2025-09-09T17:49:27.7815661Z   ❌ assets/chunk-DcmTdkuJ.js: 687.3KB
2025-09-09T17:49:27.7819043Z   ✅ assets/html2canvas.esm.js-BfxBtG_O.js: 197.5KB
2025-09-09T17:49:27.7822303Z   ✅ assets/index-CTWCRSou.css: 110.7KB
2025-09-09T17:49:27.7823007Z   ❌ assets/index-D9BrSNg4.js: 2682.3KB
2025-09-09T17:49:27.7823669Z   ✅ assets/index.es.js-CGFVHDJ_.js: 147.0KB
2025-09-09T17:49:27.7824245Z   ❌ stats.html: 1759.0KB
2025-09-09T17:49:27.7824510Z 
2025-09-09T17:49:27.7824748Z 📊 Bundle Summary:
2025-09-09T17:49:27.7825235Z   📦 Total Size: 6849.7KB / 1000KB
2025-09-09T17:49:27.7825725Z   📜 JS Files: 18 / 15
2025-09-09T17:49:27.7826156Z   🎨 CSS Files: 1 / 5
2025-09-09T17:49:27.7826772Z   🖼️  Images: 8 / 20
2025-09-09T17:49:27.7827009Z 
2025-09-09T17:49:27.7827358Z ❌ Performance Budget Violations:
2025-09-09T17:49:27.7828044Z   📦 Large chunk: assets/chunk-B0WWTYqB.js (433.9KB)
2025-09-09T17:49:27.7828834Z   📄 Large asset: assets/chunk-DcmTdkuJ.js (687.3KB)
2025-09-09T17:49:27.7829577Z   📦 Large chunk: assets/chunk-DcmTdkuJ.js (687.3KB)
2025-09-09T17:49:27.7830347Z   📄 Large asset: assets/index-D9BrSNg4.js (2682.3KB)
2025-09-09T17:49:27.7831496Z   📦 Large chunk: assets/index-D9BrSNg4.js (2682.3KB)
2025-09-09T17:49:27.7832313Z   📄 Large asset: stats.html (1759.0KB)
2025-09-09T17:49:27.7833062Z   🚨 Total bundle size exceeds budget: 6849.7KB > 1000KB
2025-09-09T17:49:27.7833724Z   🚨 Too many JS files: 18 > 15
2025-09-09T17:49:27.7834000Z 
2025-09-09T17:49:27.7834343Z 💡 Performance Optimization Suggestions:
2025-09-09T17:49:27.7834832Z 
2025-09-09T17:49:27.7835104Z 🔧 Immediate Actions:
2025-09-09T17:49:27.7835630Z   1. Run npm run build:analyze to see bundle composition
2025-09-09T17:49:27.7836288Z   2. Implement route-based code splitting for large pages
2025-09-09T17:49:27.7837128Z   3. Move heavy libraries to separate chunks
2025-09-09T17:49:27.7837670Z   4. Consider lazy loading non-critical features
2025-09-09T17:49:27.7838210Z   5. Compress or optimize large assets
2025-09-09T17:49:27.7839378Z 
2025-09-09T17:49:27.7839667Z 🚀 Advanced Optimizations:
2025-09-09T17:49:27.7841232Z   1. 🖼️  Convert images to WebP/AVIF formats
2025-09-09T17:49:27.7841902Z   2. 📦 Enable Brotli compression on CDN
2025-09-09T17:49:27.7842518Z   3. ⚡ Implement critical CSS extraction
2025-09-09T17:49:27.7843093Z   4. 🔄 Add service worker for caching
2025-09-09T17:49:27.7843660Z   5. 📱 Implement adaptive loading for slow connections
2025-09-09T17:49:27.7844276Z   6. 🎯 Set up performance monitoring alerts
2025-09-09T17:49:27.7844808Z   7. 📊 Configure Real User Monitoring (RUM)
2025-09-09T17:49:27.7845421Z   8. 🔍 Add performance budgets to CI/CD pipeline
2025-09-09T17:49:27.7845712Z 
2025-09-09T17:49:27.7845860Z 📈 SEO Impact:
2025-09-09T17:49:27.7846328Z   🎯 Page speed is a confirmed Google ranking factor
2025-09-09T17:49:27.7847215Z   📱 Mobile performance affects mobile-first indexing
2025-09-09T17:49:27.7848088Z   ⚡ Fast pages have lower bounce rates
2025-09-09T17:49:27.7848665Z   🚀 Better UX leads to higher conversion rates
2025-09-09T17:49:27.7849248Z   📊 Core Web Vitals impact search visibility
2025-09-09T17:49:27.7850523Z 💾 Results saved to: /home/runner/work/project-profit-radar/project-profit-radar/performance-budget-results.json
2025-09-09T17:49:27.7961071Z ##[error]Process completed with exit code 1.
2025-09-09T17:49:27.8029524Z ##[group]Run actions/upload-artifact@v4
2025-09-09T17:49:27.8029795Z with:
2025-09-09T17:49:27.8029968Z   name: performance-reports
2025-09-09T17:49:27.8030211Z   path: performance-*.json
dist/stats.html

2025-09-09T17:49:27.8030459Z   retention-days: 30
2025-09-09T17:49:27.8030721Z   if-no-files-found: warn
2025-09-09T17:49:27.8030942Z   compression-level: 6
2025-09-09T17:49:27.8031124Z   overwrite: false
2025-09-09T17:49:27.8031309Z   include-hidden-files: false
2025-09-09T17:49:27.8031516Z ##[endgroup]
2025-09-09T17:49:28.0525845Z With the provided path, there will be 2 files uploaded
2025-09-09T17:49:28.0568345Z Artifact name is valid!
2025-09-09T17:49:28.0569480Z Root directory input is valid!
2025-09-09T17:49:28.3688656Z Beginning upload of artifact content to blob storage
2025-09-09T17:49:28.8076046Z Uploaded bytes 200330
2025-09-09T17:49:28.8709528Z Finished uploading artifact content to blob storage!
2025-09-09T17:49:28.8713952Z SHA256 digest of uploaded artifact zip is b6bb9958db76ddd4469084be7b17e0cc98dc879d46ae169cfab0bc7f9f153b37
2025-09-09T17:49:28.8718768Z Finalizing artifact upload
2025-09-09T17:49:29.0341769Z Artifact performance-reports.zip successfully finalized. Artifact ID 3967459214
2025-09-09T17:49:29.0343481Z Artifact performance-reports has been successfully uploaded! Final size is 200330 bytes. Artifact ID is 3967459214
2025-09-09T17:49:29.0350027Z Artifact download URL: https://github.com/dj-pearson/project-profit-radar/actions/runs/17591144013/artifacts/3967459214
2025-09-09T17:49:29.0493057Z Post job cleanup.
2025-09-09T17:49:29.1469205Z [command]/usr/bin/git version
2025-09-09T17:49:29.1510161Z git version 2.51.0
2025-09-09T17:49:29.1558995Z Temporarily overriding HOME='/home/runner/work/_temp/4b43ac6f-652f-4816-9f46-0e805f243718' before making global git config changes
2025-09-09T17:49:29.1561846Z Adding repository directory to the temporary git global config as a safe directory
2025-09-09T17:49:29.1567433Z [command]/usr/bin/git config --global --add safe.directory /home/runner/work/project-profit-radar/project-profit-radar
2025-09-09T17:49:29.1610174Z [command]/usr/bin/git config --local --name-only --get-regexp core\.sshCommand
2025-09-09T17:49:29.1646228Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'core\.sshCommand' && git config --local --unset-all 'core.sshCommand' || :"
2025-09-09T17:49:29.1885533Z [command]/usr/bin/git config --local --name-only --get-regexp http\.https\:\/\/github\.com\/\.extraheader
2025-09-09T17:49:29.1910244Z http.https://github.com/.extraheader
2025-09-09T17:49:29.1923616Z [command]/usr/bin/git config --local --unset-all http.https://github.com/.extraheader
2025-09-09T17:49:29.1957894Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'http\.https\:\/\/github\.com\/\.extraheader' && git config --local --unset-all 'http.https://github.com/.extraheader' || :"
2025-09-09T17:49:29.2291722Z Cleaning up orphan processes
Apollo
