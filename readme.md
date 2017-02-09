# LL Migratr
> Migrates V1 statements, clients, and stores to a V2 database.

### Installation
1. Clone the repository `git clone git@github.com:ht2/ll-migratr.git`.
1. Install dependencies `npm install`.
1. Change your permissions `sudo chmod 775 ./bin/migrater`.

### HT2 Process
Process starts at the point where we want to actually start migrating someone's data. Listed the process below.

1. Do they have a V2 instance already? If yes, then James and Ryan need to analyse it further. Otherwise continue.
1. James does step 1-3 in [Migratr Process](#migratr-process).
1. Ryan do steps 4-6 in [Migratr Process](#migratr-process)
1. James does step 7 in [Migratr Process](#migratr-process).
1. Client needs to be notified that they can now switch their endpoint. Once switched we continue.
1. Ryan runs `./bin/migrater config.json 2 5`.
1. Ryan repeat steps 5-6 for [Migratr Process](#migratr-process).
1. James repeats step 7 for [Migratr Process](#migratr-process).
1. Client needs to be notified that they have been migrated.

### Migratr Process
1. Create an organisation in the V2 instance (use the organisation's ID in the config file).
1. Find the LRS ID in the V1 instance for use in the config file.
1. Setup your `config/foobar.json` file from the `config/example.json` file.
1. Run `./bin/migrater config.json 1 5` in this directory.
1. Check migrated data in Mongo.
1. Run `./bin/migrater config.json 6 7` in this directory.
1. Migrate data on target database.
  ```
  node bin/cli.js updateStatementCount
  nohup node bin/cli.js batchJobs -o ORG_ID -j querybuildercache &
  nohup node bin/cli.js batchJobs -o ORG_ID -j personas -b 10 &
  ```

### Migratr Steps
1. writeTimestamp
1. clearLocalData
1. dumpSourceData
1. restoreLocalData
1. migrateLocalData
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
