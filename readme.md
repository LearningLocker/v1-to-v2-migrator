# Learning Locker v1 to v2 Migrator
> Migrates v1 statements, clients, and stores to a v2 instance

## Migrating from v1 to v2

This tool will take a Learning Locker v1 database and migrate the LRS, Clients and xAPI records (Statements, Attachments, Documents) into a v2 database format. 

Please note that you will need to ensure your v1 instance is upgraded to **at least v1.12.0 or later**.

Users, Reports and Exports are not migrated as part of this process. You will need to install and create your v2 Organisation before running this migration (please see documentation) - this also sets up your initial admin user who will be able to invite subsequent users.

All client credentials attached to migrated LRS's are copied during this migration. 

Once the migration has succesffully been run, only the URL of Learning Locker will need to be changed on any Activity Provider currently sending in statements.

A timestamp is appended to the config after the initial run; subsequent runs of the migration script will then also take any statements that had been inserted into v1 since this date, allowing for any "missed" statements to be retrieved and migrated whilst switching over the Learning Locker URL. This process can be repeated as many times as required.


## Backups

**Backups of your v1 files and database should also be taken prior to using this script.** We cannot be held responsible for any loss, damage or accidental termination of your data.

**For that reason it is highly recomended that the source and target are different Mongo databases, if not different hosts.** File storage should also be separated where possible.


## Basic usage

The script works in 4 broad phases:

* Exporting required database records from your "source" v1 LRS using `mongodump`
* Restoring to a "local" Mongo instance using `mongorestore`, where migrations will be perfomed on the data
* Exporting and restoring data to a "target" database using `mongodump` and `mongorestore`
* Copying and migrating local file storage to a "target" folder - note that this stage does not have a "local" step, and will migrate your files directly from "source" to "target"


## Requirements

- A fully installed and configured v2 instance


An instance with:
- Node 6.*
- A running Mongo instance accesible at `127.0.0.1:27017` (no user credentials)
- Access to both the source and target databases


## Installation

1. Clone the repository `git clone git@github.com:LearningLocker/v1-to-v2-migrator.git`.
1. Install dependencies `npm install`.
1. Change your permissions `sudo chmod 775 ./bin/migrater`.


## Configuration

Copy the config/example.json into a new file. The config file is broken into 3 areas:


### Source

The source points to the existing v1 database and files (attachement, documents). 

Param | Description | v1 parameter
--- | --- | ---
`source.lrs` | The `_id` of LRS you wish to migrate.<br><br>It is possible to filter to a single LRS if required . This is useful if you require migrating different LRSs to different v2 instances, or even different Organisations within the same v2 instance.<br><br>By default, if left blank, all LRSs will be migrated. | The lrs's `_id`
`source.database` | **This section contains information about your source v1 database** | `app/config/.../database.php`
`source.database.hosts` | The host(s) of you source Mongo instance | `host`
`source.database.name` | Database name | `database`
`source.database.user` | User with read access to database | `username`
`source.database.password` | Password | `password
`source.database.authenticationDatabase` | Mongo authentication database (if required) | `options.authenticationDatabase`
`source.database.ssl` | Boolean - use SSL for transfer | `options.ssl`
`source.documentStorage.storageType` | Either `local` or `s3`<br><br>Determines where the script will look to find v1 Attachments and Documents | `FS_REPO`
`source.documentStorage.local.storageDir` | The absolute path to the v1 storage directory | `FS_LOCAL_ENDPOINT`
`source.documentStorage.s3` | **This section contains information about your AWS S3 v1 storage** | 
`source.documentStorage.s3.bucketName` | The S3 bucket | 'FS_S3V3_BUCKET'
`source.documentStorage.s3.subFolder` | The subFolder within S3 | 'FS_S3V3_PREFIX'
`source.documentStorage.s3.region` | The S3 region | `FS_S3V3_REGION`
`source.documentStorage.s3.accessKeyId` | AWS access key ID | `FS_S3V3_ACCESS_KEY`
`source.documentStorage.s3.secretAccessKey` | AWS secret access key | `FS_S3V3_SECRET`


### Local

Param | Description
--- | ---
`local.database` | Database name on the local `127.0.0.1:27017` instance.<br><br>Data is restored, migrated and exported from this database and will be cleared down with subsequent runs of the scripts.
`local.sourceDumpLocation` | Absolute or relative directory to export source mongodump to
`local.targetDumpLocation` | Absolute or relative directory to export migrated mongodump, prior to target restoration (mongorestore)


### Target

Param | Description
--- | ---
`target.organisation` | The `_id` of the Organisation where all data will be inserted to.<br><br>This can be found in your newly setup v2 database, or simply by looking at the URL of an organisation when you have accessed it in the v2 GUI.
`target.database` | **This section contains information about your target v1 database**
`target.database.hosts` | The host(s) of you target Mongo instance
`target.database.name` | Database name
`target.database.user` | User with read access to database
`target.database.password` | User password
`target.database.authenticationDatabase` | Mongo authentication database (if required)
`target.database.ssl` | Boolean - use SSL for transfer
`target.documentStorage.storageType` | Either `local` or `s3`<br><br>Determines where the script will push Attachments and Documents for v2
`target.documentStorage.local.storageDir` | The absolute path to the target storage directory
`target.documentStorage.s3` | **This section contains information about your AWS S3 v2 storage**
`target.documentStorage.s3.bucketName` | The S3 bucket 
`target.documentStorage.s3.subFolder` | The subFolder within S3
`target.documentStorage.s3.region` | The S3 region
`target.documentStorage.s3.accessKeyId` | AWS access key ID
`target.documentStorage.s3.secretAccessKey` | AWS secret access key


## Command

To run the process, execute the following:

```
./bin/migrater <config_file_location> [start_step [end_step]]
```
`config_file_location`: A relative or absolute path to your config file

`start`: The first "step" you wish to run (defaults to 1)

`end`: The last "step" you wish to run (defaults to 8)


### Example
```
./bin/migrater config/ht2.json 1 5
```


### Steps

1. `writeTimestamp` - Write a current timestamp to the config
1. `clearLocalData` - Clear down existing "local" database and database mongodump/mongorestores
1. `dumpSourceData` - mongodump all matching data from the "source"
1. `restoreLocalData` - restore the dumped data to "local"
1. `migrateLocalData` - locally migrate from v1 to v2
1. `migrateDocumentStorage` - Migrate state documents (files) directly from "source" to "target" (**no local step provided here**)
1. `migrateAttachmentStorage` - Migrate statement attachment files directly from "source" to "target" (**no local step provided here**)
1. `dumpLocalData` - Dump the locally migrated data
1. `restoreTargetData` - Restore migrated data into target


## Full process:

1. Copy the `config/example.json` file into a new config file
1. Create an organisation in your V2 instance - enter the organisation's `_id` into the config
1. (optional) Find the LRS `_id` in the V1 instance for use in the config file, or leave blank to copy all LRSs
1. Run `node ./bin/migrater config/YOURCONFIG.json` in this directory.


## Final steps

Learning Locker's workers are setup to provide extra processing to statements as they are consumed through the LRS.  Your newly migrated data will have not have had these processes applied. You may run the following to provide that functionality.

Instead, you will need to run these commands on your v2 instance at the root of where v2 is installed

Update the store count on each LRS:
```
node cli/dist/server updateStatementCount 
```

#### Query Builder Caches:

Populate the Query Builder:
```
node cli/dist/server batchJobs -j querybuildercache
```

Persona processing:

Create "personas" for each agent:
```
node cli/dist/server batchJobs -j personas -b 1000
```
