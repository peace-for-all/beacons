const [major, minor] = process.versions.node.split(".").map(Number);

if (major < 22 || (major === 22 && minor < 13)) {
  process.stderr.write(
    `Beacons requires Node >=22.13.0; current runtime is ${process.versions.node}. Run nvm use.\n`,
  );
  process.exit(1);
}
