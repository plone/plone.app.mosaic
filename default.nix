{ rev ? "3a4e2376e444fd7664102af00a34c65b47e271ec"
, sha256 ? "1ab6b42hzc4ylyn6wi84y32idgykfvz8vi6dbr1cqykcl6n8s6iz"
, pkgs ? import ((import <nixpkgs> {}).pkgs.fetchFromGitHub {
    owner = "NixOS";
    repo = "nixpkgs-channels";
    inherit rev;
    inherit sha256;
  }) {}
, pythonPackages ? pkgs.python27Packages
}:

with pkgs;
with pkgs.rustPlatform;

let self = rec {
  geckodriver = buildRustPackage rec {
    version = "0.10.0";
    name = "geckodriver-${version}";
    src = fetchurl {
      url = "https://github.com/mozilla/geckodriver/archive/v0.10.0.tar.gz";
      sha256 = "1xa7qnbba1sanczqwc7462yxbnma0a7mrkr4ngz8mm1i33hdkgdx";
    };
    depsSha256 = "1j2lh3vqzg1hfcx4b9sg00l1bn0np9v5w4pmk8vhjp0iiwddxbjz";
  };
  selenium = pythonPackages.selenium.overrideDerivation (old: rec {
    name = "selenium-3.0.0b3";
    src = fetchurl {
      url = "https://pypi.python.org/packages/54/4e/5efe0adb5210c2d96c060287d70274d5aa1987c052a0e56e4d8fe31207ad/selenium-3.0.0b3.tar.gz";
      sha256 = "1i00rapidydyxjxlzwc41s74zcbz6ck81qg6lgsa9bb06vw1mnkp";
    };
    patches = [
      (builtins.toFile "fix_profiledir_permissions.patch" ''
--- a/py/selenium/webdriver/firefox/firefox_profile.py  2016-01-13 11:32:42.000000000 +0200
+++ b/py/selenium/webdriver/firefox/firefox_profile.py  2016-01-13 11:32:12.000000000 +0200
@@ -77,6 +77,7 @@
             shutil.copytree(self.profile_dir, newprof,
                             ignore=shutil.ignore_patterns("parent.lock", "lock", ".parentlock"))
             self.profile_dir = newprof
+            os.chmod(self.profile_dir, 0755)
             self._read_existing_userjs(os.path.join(self.profile_dir, "user.js"))
         self.extensionsDir = os.path.join(self.profile_dir, "extensions")
         self.userPrefs = os.path.join(self.profile_dir, "user.js")
@@ -173,6 +173,6 @@
         for base, dirs, files in os.walk(self.path):
             for fyle in files:
                 filename = os.path.join(base, fyle)
-                zipped.write(filename, filename[path_root:])
+                zipped.writestr(open(filename).read(), filename[path_root:])
         zipped.close()
         return base64.b64encode(fp.getvalue()).decode('UTF-8')

--- a/py/selenium/webdriver/remote/webdriver.py  2016-01-13 11:32:42.000000000 +0200
+++ b/py/selenium/webdriver/remote/webdriver.py  2016-01-13 11:32:12.000000000 +0200
@@ -176,6 +176,8 @@
                 capabilities[k].update(v)
         if browser_profile:
             capabilities['desiredCapabilities']['firefox_profile'] = browser_profile.encoded
+        if 'firefox_profile' in capabilities['desiredCapabilities']:
+            del capabilities['desiredCapabilities']['firefox_profile']
         response = self.execute(Command.NEW_SESSION, capabilities)
         self.session_id = response['sessionId']
         self.capabilities = response['value']
      '')
    ];
    patchPhase = null;
    postPatch = old.patchPhase;
    propagatedNativeBuildInputs = old.propagatedNativeBuildInputs ++ [
        geckodriver
    ];
  });
  robotframework = pythonPackages.robotframework.overrideDerivation(args: rec {
    name = "robotframework-3.0";
    src = fetchurl {
      url = "https://pypi.python.org/packages/source/r/robotframework/robotframework-3.0.tar.gz";
      sha256 = "11qwa1y5ph2fh0k2chmrycbnl15m23726x8ar9aagf1i63wga5nd";
    };
  });
  decorator = pythonPackages.decorator.overrideDerivation(args: rec {
    name = "decorator-3.4.2";
    src = fetchurl {
      url = "https://pypi.python.org/packages/source/d/decorator/decorator-3.4.2.tar.gz";
      sha256 = "0i2bnlkh0p9gs76hb28mafandcrig2fmv56w9ai6mshxwqn0083k";
    };
    preCheck = null;
  });
  robotframework-selenium2library = pythonPackages.robotframework-selenium2library.overrideDerivation(args: rec {
    name = "robotframework-selenium2library-1.8.0";
    src = fetchurl {
      url = "https://pypi.python.org/packages/0a/d4/5bd64ce78d66e1a4d69457a12c90887cd468dc4de94709e35d12abe3c2ed/robotframework-selenium2library-1.8.0.tar.gz";
      sha256 = "1yf0k0v7l3y58i30al9pca4dnxksqwshz01c5j266vvs4frq7f9c";
    };
    propagatedNativeBuildInputs = [
      robotframework
      selenium
      decorator
      pythonPackages.docutils
    ];
  });
  buildout = pythonPackages.zc_buildout_nix.overrideDerivation (args: {
    postInstall = "";
    propagatedNativeBuildInputs = [
      robotframework-selenium2library
      pythonPackages.watchdog
      pythonPackages.ldap
      (pythonPackages.lxml.overrideDerivation(args: {
       name = "lxml-3.4.4";
       src = fetchurl {
         url = "http://pypi.python.org/packages/source/l/lxml/lxml-3.4.4.tar.gz";
         sha256 = "16a0fa97hym9ysdk3rmqz32xdjqmy4w34ld3rm3jf5viqjx65lxk";
       };
      }))
      (pythonPackages.pillow.overrideDerivation(args: {
       name = "Pillow-3.1.1";
       buildInputs = with pkgs; args.nativeBuildInputs ++ [ unzip ];
       src = fetchurl {
         url = "https://pypi.python.org/packages/64/d8/374b717aba5b81ecec65ccbf29b0bd7b7a1f235b67fb7dac6c63ddfe6705/Pillow-3.3.1.zip";
         sha256 = "00ipg9f1dap6g4ya49v8xbyvlwhyrkjkx5cr5v0fnqjqy3i5k9nd";
       };
      }))
    ];
  });
};
in stdenv.mkDerivation rec {
  name = "env";
  env = buildEnv { name = name; paths = buildInputs; };
  builder = builtins.toFile "builder.sh" ''
    source $stdenv/setup; ln -s $env $out
  '';
  buildInputs = with self; [
    buildout
    (pythonFull.buildEnv.override {
      extraLibs = buildout.propagatedNativeBuildInputs;
    })
  ];
  shellHook = ''
    export BUILDOUT_ARGS="\
        versions:setuptools= \
        versions:zc.buildout= \
        versions:Pillow= \
        versions:lxml= \
        versions:selenium= \
        versions:docutils= \
        versions:decorator= \
        versions:robotframework= \
        versions:robotframework-selenium2library= \
    "
  '';
}
