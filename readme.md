# LL Migratr
> Migrates V1 statements, clients, and stores to a V2 database.

### Installation
1. Clone the repository `git clone git@github.com:ht2/ll-migratr.git`.
1. Install dependencies `npm install`.
1. Change your permissions `sudo chmod 775 ./bin/migrater`.

### Migratr Process
1. Create an organisation in the V2 instance (use the organisation's ID in the config file).
1. Find the LRS ID in the V1 instance for use in the config file.
1. Setup your `config/foobar.json` file from the `config/example.json` file.
1. Run `./bin/migrater config.json 1 6` in this directory.
1. Check migrated data in Mongo.
1. Run `./bin/migrater config.json 7 8` in this directory.
1. Migrate data on target database.
  ```
  node cli/dist/server updateStatementCount
  nohup node cli/dist/server batchJobs -o ORG_ID -j querybuildercache &
  nohup node cli/dist/server batchJobs -o ORG_ID -j personas -b 10 &
  ```

### Migratr Steps
1. writeTimestamp
1. clearLocalData
1. dumpSourceData
1. restoreLocalData
1. migrateLocalData
1. migrateDocumentStorage
1. dumpLocalData
1. restoreTargetData

### Command
Format
```
./bin/migrater <config_file_location> [start_step [end_step]]
```

Example
```
./bin/migrater config/ht2.json 1 5
```
