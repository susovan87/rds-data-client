DROP DATABASE IF EXISTS myDatabase;
CREATE DATABASE IF NOT EXISTS myDatabase;
USE myDatabase;

DROP TABLE IF EXISTS myTable;

/*!50503 set default_storage_engine = InnoDB */;
/*!50503 select CONCAT('storage engine: ', @@default_storage_engine) as INFO */;

CREATE TABLE myTable (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(64) NOT NULL,
    `age` TINYINT UNSIGNED NULL,
    `has_curls` TINYINT(1) NULL,
    PRIMARY KEY (`id`)
);

INSERT INTO myTable (name,age,has_curls) VALUES('Alice',NULL,FALSE);
INSERT INTO myTable (name,age,has_curls) VALUES('Mike',52,TRUE);
INSERT INTO myTable (name,age,has_curls) VALUES('Carol',50,FALSE);


/* myOtherDatabase */
DROP DATABASE IF EXISTS myOtherDatabase;
CREATE DATABASE IF NOT EXISTS myOtherDatabase;
USE myOtherDatabase;

DROP TABLE IF EXISTS myOtherTable;

/*!50503 set default_storage_engine = InnoDB */;
/*!50503 select CONCAT('storage engine: ', @@default_storage_engine) as INFO */;

CREATE TABLE myOtherTable (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(64) NOT NULL,
    `DOB` DATE NULL,
    `weight` FLOAT NULL,
    `bio` TEXT NULL,
    `isActive` TINYINT(1) NOT NULL,
    `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
);

INSERT INTO myOtherTable (name,DOB,weight,bio,isActive) VALUES('Marcia',NULL,81.8,'I am a Teacher',TRUE);
INSERT INTO myOtherTable (name,DOB,weight,bio,isActive) VALUES('Peter','2008-7-04',NULL,'I am a Student',TRUE);
