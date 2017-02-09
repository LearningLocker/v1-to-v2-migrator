# LL Migratr
> Migrates V1 statements, clients, and stores to a V2 database.

### Users
1. Clone the repository `git clone git@github.com:ht2/ll-migratr.git`.
1. Install dependencies `npm install`.
1. Change your permissions `sudo chmod 775 ./bin/migrater`.
1. Create an organisation in the V2 instance (use the organisation's ID in the config file).
1. Find the LRS ID in the V1 instance for use in the config file.
1. Setup your `config/foobar.json` file from the `config/example.json` file.
1. Run `./bin/migrater config.json` in this directory.
1. Migrate data on target database.
  ```
  node bin/cli.js updateStatementCount
  nohup node bin/cli.js batchJobs -o ORG_ID -j querybuildercache &
  nohup node bin/cli.js batchJobs -o ORG_ID -j personas -b 10 &
  ```
1. Change endpoint on activity provider.
1. Run `./bin/migrater config.json` in this directory.
1. Migrate data on target database.
  ```
  node bin/cli.js updateStatementCount
  nohup node bin/cli.js batchJobs -o ORG_ID -j querybuildercache &
  nohup node bin/cli.js batchJobs -o ORG_ID -j personas -b 10 &
  ```

[Google Doc](https://docs.google.com/document/d/1uW25C4GQ7OWLXGXKiAwYDPVcKvxWiYbLAeg2nmWJzm0/edit?ts=5899dc4d#)

### Command
Format
```
./bin/migrater <config_file_location> [start_step [end_step]]
```

Example
```
./bin/migrater config/ht2.json 1 5
```

### Steps
1. clearLocalData
1. writeTimestamp
1. dumpSourceData
1. restoreLocalData
1. migrateLocalData
1. dumpLocalData
1. restoreTargetData
