# LL Migratr
> Migrates V1 statements, clients, and stores to a V2 database.

## Migrating from v1 to v2

This tool will take a Learning Locker v1 database and migrate the LRS, Clients and xAPI records (Statements, Attachments, Documents) into a v2 database format. 

Users, Reports and Exports are not migrated as part of this process. You will need to install and create your v2 Organisation before running this migration (please see documentation) - this also sets up your initial admin user who will be able to invite subsequent users.

All client credentials attached to migrated LRS's are copied during this migration. 

Once the migration has succesffully been run, only the URL of Learning Locker will need to be changed on any Activity Provider currently sending in statements.

A timestamp is appended to the config after the initial run; subsequent runs of the migration script will then also take any statements that had been inserted into v1 since this date, allowing for any "missed" statements to be retrieved and migrated whilst switching over the Learning Locker URL. This process can be repeated as many times as required.

## Basic usage:

The script works in 4 broad phases:

* Exporting required database records from your "source" v1 LRS
* Restoring to a "local" Mongo instance, where migrations will be perfomed on the data
* Exporting and restoring data to a "target" database 
* Copying and migrating local storage to a "target" folder"

#### Backups

**Backups of your v1 files and database should also be taken prior to using this script.** We cannot be held responsible to any loss, damage or accidental termination of your data.

**For that reason it is highly recomended that the source and target are all different Mongo databases, if not different hosts.** File storage should also be separate where possible.

### Requirements

In order to run this script you will need an instance with:
- Node 6+
- A running Mongo instance on 127.0.0.1:27017
- Access to both the source and target databases

### Installation:
1. Clone the repository `git clone git@github.com:ht2/ll-migratr.git`.
1. Install dependencies `npm install`.
1. Change your permissions `sudo chmod 775 ./bin/migrater`.

### Configuration:

Copy the config/example.json into a new file. The config file is broken into 3 areas:

#### Source

The source points to the existing v1 database and files (attachement, documents). 

Param | Description
--- | ---
`source.lrs` | The `_id` of LRS you wish to migrate.<br><br>It is possible to filter to a single LRS if required . This is useful if you require migrating different LRSs to different v2 instances, or even different Organisations within the same v2 instance.<br><br>By default, if left blank, all LRSs will be migrated.
`source.database` | **This section contains information about your source v1 database**
`source.database.hosts` | The host(s) of you source Mongo instance
`source.database.name` | Database name
`source.database.user` | User with read access to database
`source.database.password` | User password
`source.database.authenticationDatabase` | Mongo authentication database (if required)
`source.database.ssl` | Boolean - use SSL for transfer
`source.documentStorage.storageType` | Either `local` or `s3`<br><br>Determines where the script will look to find v1 Attachments and Documents
`source.documentStorage.local.storageDir` | The absolute path to the storage directory
`source.documentStorage.s3` | **This section contains information about your AWS S3 v1 storage**
`source.documentStorage.s3.bucketName` | The S3 bucket 
`source.documentStorage.s3.subFolder` | The subFolder within S3 (aka `FS_S3V3_PREFIX` in v1)
`source.documentStorage.s3.region` | The S3 region
`source.documentStorage.s3.accessKeyId` | AWS access key ID
`source.documentStorage.s3.secretAccessKey` | AWS secret access key


#### Local

Param | Description
--- | ---
`local.database` | The name of the database on the local instance where data is restored, migrated and exported from before being pushed to the target DB.

#### Target





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
