{ rev ? "c3df8bdd2869ecc4b73e05ad5d932b27f4a50e0a"
, sha256 ? "0phjjxl4ahkafpm16gcfsprslgviwk63qnr0l7qsg8nn732480a7"
, pkgs ? import ((import <nixpkgs> {}).pkgs.fetchFromGitHub {
    owner = "NixOS";
    repo = "nixpkgs";
    inherit rev;
    inherit sha256;
  }) {}
, pythonPackages ? pkgs.python27Packages
}:

with pkgs;
with rustPlatform;

let self = rec {
  geckodriver = buildRustPackage rec {
    version = "0.15.0";
    name = "geckodriver-${version}";
    src = fetchurl {
      url = "https://github.com/mozilla/geckodriver/archive/v0.15.0.tar.gz";
      sha256 = "0kxy85bvavr8clhnzdqha5k197dhjvpq8xhbgyrv0az2xvcmmp25";
    };
    depsSha256 = "0xhpzhsk213vnmd8b85sjahy392sayx5y4x7qhcs8k5x9k65ngp7";
  };
  selenium = pythonPackages.selenium.overrideDerivation (old: rec {
    name = "selenium-3.3.3";
    src = fetchurl {
      url = "https://pypi.python.org/packages/0c/2d/6c51aceb5ad1f9fa75edc7dd47062af19ae79fe49b70ad0089060fb7ac69/selenium-3.3.3.tar.gz";
      sha256 = "0kbs377pic67f29kalznipx15waz01mijh5jasvz9azkymsafg8f";
    };
    patches = [
      (builtins.toFile "fix_profiledir_permissions.patch" ''
--- a/selenium/webdriver/firefox/firefox_profile.py  2016-01-13 11:32:42.000000000 +0200
+++ b/selenium/webdriver/firefox/firefox_profile.py  2016-01-13 11:32:12.000000000 +0200
@@ -77,6 +77,7 @@
             shutil.copytree(self.profile_dir, newprof,
                             ignore=shutil.ignore_patterns("parent.lock", "lock", ".parentlock"))
             self.profile_dir = newprof
+            os.chmod(self.profile_dir, 0755)
             self._read_existing_userjs(os.path.join(self.profile_dir, "user.js"))
         self.extensionsDir = os.path.join(self.profile_dir, "extensions")
         self.userPrefs = os.path.join(self.profile_dir, "user.js")
@@ -172,6 +172,6 @@
         for base, dirs, files in os.walk(self.path):
             for fyle in files:
                 filename = os.path.join(base, fyle)
-                zipped.write(filename, filename[path_root:])
+                zipped.writestr(open(filename).read(), filename[path_root:])
         zipped.close()
         return base64.b64encode(fp.getvalue()).decode('UTF-8')
--- a/selenium/webdriver/remote/webdriver.py  2016-01-13 11:32:42.000000000 +0200
+++ b/selenium/webdriver/remote/webdriver.py  2016-01-13 11:32:12.000000000 +0200
@@ -180,8 +180,12 @@
         w3c_caps.update(capabilities)
         if browser_profile:
             w3c_caps["firstMatch"].append({"firefox_profile": browser_profile.encoded})
         parameters = {"capabilities": w3c_caps,
                       "desiredCapabilities": capabilities}
+        try:
+            del parameters['capabilities']['moz:firefoxOptions']['profile']
+        except KeyError:
+            pass
         response = self.execute(Command.NEW_SESSION, parameters)
         if 'sessionId' not in response:
             response = response['value']
      '')
    ];
    prePatch = ''
      mkdir -p py
      cp -R selenium py/selenium
    '';
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
