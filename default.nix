{ pkgs ? import (builtins.fetchTarball  # revision for reproducible builds
  "https://github.com/nixos/nixpkgs-channels/archive/nixos-16.03.tar.gz") {}
, pythonPackages ? pkgs.python27Packages
}:

let self = rec {
  version = "dev";  # builtins.replaceStrings ["\n"] [""] (builtins.readFile ./VERSION);

  selenium = pythonPackages.selenium.overrideDerivation (args: rec {
    name = "selenium-3.0.0b2";
    src = pkgs.fetchurl {
      url = "https://pypi.python.org/packages/5d/9f/6bae7490ad5691bf6118c077a986b9eb2c31b93fe230708a286ee97f3b94/selenium-3.0.0b2.tar.gz";
      sha256 = "0rsidck2qaw01j2jpw04d55972jy7fw2zf4w11wzn4v34ff4hl59";
    };
    patches = [
      (builtins.toFile "fix_profiledir_permissions.patch" ''
--- a/py/selenium/webdriver/firefox/firefox_profile.py  2016-01-13 11:32:42.000000000 +0200
+++ b/py/selenium/webdriver/firefox/firefox_profile.py  2016-01-13 11:32:12.000000000 +0200
@@ -76,6 +76,7 @@
             shutil.copytree(self.profile_dir, newprof,
                             ignore=shutil.ignore_patterns("parent.lock", "lock", ".parentlock"))
             self.profile_dir = newprof
+            os.chmod(self.profile_dir, 0755)
             self._read_existing_userjs(os.path.join(self.profile_dir, "user.js"))
         self.extensionsDir = os.path.join(self.profile_dir, "extensions")
         self.userPrefs = os.path.join(self.profile_dir, "user.js")
      '')
    ];
    patchPhase = null;
    postPatch = args.patchPhase;
  });
  robotframework = pythonPackages.robotframework.overrideDerivation(args: rec {
    name = "robotframework-3.0";
    src = pkgs.fetchurl {
      url = "https://pypi.python.org/packages/source/r/robotframework/robotframework-3.0.tar.gz";
      sha256 = "11qwa1y5ph2fh0k2chmrycbnl15m23726x8ar9aagf1i63wga5nd";
    };
  });
  decorator = pythonPackages.decorator.overrideDerivation(args: rec {
    name = "decorator-3.4.2";
    src = pkgs.fetchurl {
      url = "https://pypi.python.org/packages/source/d/decorator/decorator-3.4.2.tar.gz";
      sha256 = "0i2bnlkh0p9gs76hb28mafandcrig2fmv56w9ai6mshxwqn0083k";
    };
    preCheck = null;
  });
  robotframework-selenium2library = pythonPackages.robotframework-selenium2library.overrideDerivation(args: rec {
    name = "robotframework-selenium2library-1.7.4";
    src = pkgs.fetchurl {
      url = "https://pypi.python.org/packages/source/r/robotframework-selenium2library/robotframework-selenium2library-1.7.4.tar.gz";
      sha256 = "004lmlryhbxd5avbqcgyq2gmscbhp57rrnad9yha8jvf3h1f6cj3";
    };
    propagatedNativeBuildInputs = [
      robotframework
      selenium
      decorator
      pythonPackages.docutils
    ];
  });
};
in pkgs.stdenv.mkDerivation rec {
  name = "env";
  # Define nix-build -buildable python interpreter
  env = pythonPackages.python.buildEnv.override {
    extraLibs = buildInputs;
   };
  builder = builtins.toFile "builder.sh" ''
    source $stdenv/setup; ln -s $env $out
  '';
  # Define nix-shell and interpreter requirements
  buildInputs = with self; [
    (pythonPackages.zc_buildout_nix.overrideDerivation (args: {
      postInstall = "";
      propagatedNativeBuildInputs = [
        robotframework-selenium2library
        pythonPackages.watchdog
        pythonPackages.readline
        (pythonPackages.lxml.overrideDerivation(args: {
         name = "lxml-3.4.4";
         src = pkgs.fetchurl {
           url = "http://pypi.python.org/packages/source/l/lxml/lxml-3.4.4.tar.gz";
           md5 = "a9a65972afc173ec7a39c585f4eea69c";
         };
        }))
        (pythonPackages.pillow.overrideDerivation(args: {
         name = "Pillow-3.1.1";
         src = pkgs.fetchurl {
           url = "https://pypi.python.org/packages/source/P/Pillow/Pillow-3.1.1.zip";
           md5 = "3868f54fd164e65f95fbcb32f62940ae";
         };
        }))
      ];
    }))
    pkgs.phantomjs
  ];
  # Define nix-shell with BUILDOUT_ARGS to override pins with nix verions
  shellHook = ''
    export BUILDOUT_ARGS="\
        versions:decorator= \
        versions:lxml= \
        versions:Pillow= \
        versions:python-ldap= \
        versions:robotframework= \
        versions:selenium= \
        versions:setuptools= \
        versions:zc.buildout= \
        config:plone-hotfixes= \
        config:chameleon-cache=/tmp"
  '';
}
