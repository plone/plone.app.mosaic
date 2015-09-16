with import <nixpkgs> {};
stdenv.mkDerivation {
  name = "myEnv";
  buildInputs = [
    git
    gnumake
    nodejs
    (pythonPackages.zc_buildout_nix.overrideDerivation(args: {
      postInstall = "";
      propagatedBuildInputs = [
        pythonPackages.readline
        (pythonPackages.watchdog.override {
          buildInputs = [
            pkgs.darwin.apple_sdk.frameworks.CoreFoundation
            pkgs.darwin.apple_sdk.frameworks.CoreServices
          ];
          doCheck = false;
        })
        (pythonPackages.lxml.override {
          name = "lxml-2.3.6";
          src = fetchurl {
            url = "https://pypi.python.org/packages/source/l/lxml/lxml-2.3.6.tar.gz";
            md5 = "d5d886088e78b1bdbfd66d328fc2d0bc";
          };
          doCheck = false;
        })
        (pythonPackages.pillow.override {
          name = "Pillow-2.7.0";
          src = fetchurl {
            url = "https://pypi.python.org/packages/source/P/Pillow/Pillow-2.7.0.zip";
            md5 = "da10ee9d0c0712c942224300c2931a1a";
          };
          doCheck = false;
        })
      ];
    }))
  ];
  shellHook = ''
    export SSL_CERT_FILE=~/.nix-profile/etc/ca-bundle.crt
  '';
}
