ALTER TABLE globalSearches ADD `createdAt` TIMESTAMP NOT NULL , ADD `updatedAt` TIMESTAMP NOT NULL , ADD `deletedAt` TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE passwordReset ADD `createdAt` TIMESTAMP NOT NULL , ADD `updatedAt` TIMESTAMP NOT NULL , ADD `deletedAt` TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE payments ADD `createdAt` TIMESTAMP NOT NULL , ADD `updatedAt` TIMESTAMP NOT NULL , ADD `deletedAt` TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE searchLogs ADD `createdAt` TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE searchLogs ADD `updatedAt` TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE searchLogs ADD `deletedAt` TIMESTAMP NULL DEFAULT NULL;


ALTER TABLE smsGateways ADD `createdAt`  TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE smsGateways ADD updatedAt  TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE smsGateways ADD `deletedAt` TIMESTAMP NULL DEFAULT NULL;


ALTER TABLE user RENAME `createdAt` TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE user ADD `updatedAt` TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE user ADD `deletedAt` TIMESTAMP NULL DEFAULT NULL;

ALTER TABLE userSearches ADD `createdAt` TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE userSearches ADD `updatedAt` TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE userSearches ADD `deletedAt` TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE restaurants ADD `createdAt` TIMESTAMP NOT NULL , ADD `updatedAt` TIMESTAMP NOT NULL , ADD `deletedAt` TIMESTAMP NULL DEFAULT NULL;

ALTER TABLE restaurants ADD `createdAt` TIMESTAMP NOT NULL , ADD `deletedAt` TIMESTAMP NOT NULL ;

ALTER TABLE `passwordReset` CHANGE `deletedAt` `deletedAt` TIMESTAMP NULL DEFAULT NULL;

UPDATE `activationCodes` SET deletedAt = NULL;
ALTER TABLE `activationCodes` CHANGE `deletedAt` `deletedAt` TIMESTAMP NULL DEFAULT NULL;
UPDATE `passwordReset` SET deletedAt = NULL;
ALTER TABLE `globalSearches` CHANGE `deletedAt` `deletedAt` TIMESTAMP NULL DEFAULT NULL;


SELECT `id`, `email`, `password`, `firstName`, `lastName`, `zipCode`, `phone`, `carrier`, `sendTxt`, `sendEmail`, `emailTimeout`, `smsTimeout`, `activated`, `subExpires`, `createdAt`, `updatedAt`, `deletedAt` FROM `users` AS `users` WHERE (`users`.`deletedAt` IS NULL AND `users`.`email`='voss.matthew@gmail.com') LIMIT 1;

SELECT `id`, `restaurant`, `date`, `partySize`, `uid`, `user`, `enabled`, `deleted`, `lastEmailNotification`, `lastSMSNotification`, `createdAt`, `updatedAt`, `deletedAt` FROM `userSearches` AS `userSearches` WHERE (`userSearches`.`deletedAt` IS NULL AND `userSearches`.`user`=1 AND `userSearches`.`deleted`=0 AND `userSearches`.`enabled`=1) ORDER BY (CASE WHEN date < UTC_TIMESTAMP() THEN 0 ELSE 1 END) DESC, date ASC;

SELECT users.*
FROM users
LEFT JOIN userSearches ON users.id = userSearches.user AND userSearches.deleted = 0
WHERE userSearches.uid IN (
  SELECT uid FROM searchLogs WHERE dateSearched >= NOW() - INTERVAL 1 DAY AND foundSeats = 1 GROUP BY uid
) AND (users.subExpires < NOW() OR users.subExpires IS NULL)
GROUP BY users.id;

SELECT users.*
FROM users
JOIN userSearches ON users.id = userSearches.user
JOIN searchLogs ON userSearches.uid = searchLogs.uid
WHERE (users.subExpires < NOW() OR users.subExpires IS NULL)
AND searchLogs.dateSearched >= NOW() - INTERVAL 1 DAY
AND searchLogs.foundSeats = 1
AND userSearches.deleted = 0
GROUP BY users.id;

SELECT userSearches.*, restaurants.name, count(searchLogs.id) as count
FROM userSearches
JOIN searchLogs ON userSearches.uid = searchLogs.uid
JOIN restaurants ON userSearches.restaurant = restaurants.id
WHERE userSearches.user = 45
AND searchLogs.dateSearched >= NOW() - INTERVAL 1 DAY
AND searchLogs.foundSeats = 1
AND userSearches.deleted = 0
GROUP BY userSearches.uid;
