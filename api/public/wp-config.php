<?php
/**
 * The base configurations of the WordPress.
 *
 * This file has the following configurations: MySQL settings, Table Prefix,
 * Secret Keys, and ABSPATH. You can find more information by visiting
 * {@link http://codex.wordpress.org/Editing_wp-config.php Editing wp-config.php}
 * Codex page. You can get the MySQL settings from your web host.
 *
 * This file is used by the wp-config.php creation script during the
 * installation. You don't have to use the web site, you can just copy this file
 * to "wp-config.php" and fill in the values.
 *
 * @package WordPress
 */

// ** MySQL settings - You can get this info from your web host ** //
/** The name of the database for WordPress */
define( 'WP_CACHE', true );
define('DB_NAME', '16902_wp_kuchyneainteriery_cz');
define('DB_USER', '16902_59606');
define('DB_PASSWORD', 'fJ4m6G7kMZEE');
define('DB_HOST', 'localhost');
define('WP_HOME', "https://".$_SERVER['HTTP_HOST']); // no trailing slash
define('WP_SITEURL', "https://".$_SERVER['HTTP_HOST']);  // no trailing slash

/** Database Charset to use in creating database tables. */
define('DB_CHARSET', 'utf8');

/** The Database Collate type. Don't change this if in doubt. */
define('DB_COLLATE', '');

/**#@+
 * Authentication Unique Keys and Salts.
 *
 * Change these to different unique phrases!
 * You can generate these using the {@link https://api.wordpress.org/secret-key/1.1/salt/ WordPress.org secret-key service}
 * You can change these at any point in time to invalidate all existing cookies. This will force all users to have to log in again.
 *
 * @since 2.6.0
 */

/**#@-*/

/**
 * WordPress Database Table prefix.
 *
 * You can have multiple installations in one database if you give each a unique
 * prefix. Only numbers, letters, and underscores please!
 */
$table_prefix  = 'wp_';

/**
 * For developers: WordPress debugging mode.
 *
 * Change this to true to enable the display of notices during development.
 * It is strongly recommended that plugin and theme developers use WP_DEBUG
 * in their development environments.
 */
define('WP_DEBUG', false);

/* That's all, stop editing! Happy blogging. */

/** Absolute path to the WordPress directory. */
if ( !defined('ABSPATH') )
	define('ABSPATH', dirname(__FILE__) . '/');

/** Sets up WordPress vars and included files. */
//require_once(ABSPATH . 'wp-settings.php');



define('AUTH_KEY',         'sVk7q?prs_H*hmHM/bn[C;ypu0RY=dS]=R/:Yy_(R{tZ/I6y&EMePqOBdyW+_<;@');
define('SECURE_AUTH_KEY',  'vPv,X8dGrc]%j{mG1Vf1meUI}Ue DT-<7 3Noxp]M[5=:&no^SY%^Ltn#_M+AO${');
define('LOGGED_IN_KEY',    'Dc9f$H1U?a[0UG%d~4a+dI_f8j<Hfo7P31P%}D`v8-}46e|9-!g6~-HD?^bJ(hj1');
define('NONCE_KEY',        'M{BXJ+|[A^fiiE{:|[&1L~!Uo%6;JG#>&RC51u.8bvRxoatVVsq[qvdIdwq!J+$5');
define('AUTH_SALT',        'Vp@x-(+_Ev.K/p=PljdE-2f}H[GGPzd~-=|s}V&AJnpvQ1OwC<HdleqEy6l}84d|');
define('SECURE_AUTH_SALT', '*i{{g<zL,I-y+-(,^#0@3uqp;+gU`{Av{etTe=4M[7#^&p6*W[G8bYN|9/|^`vC#');
define('LOGGED_IN_SALT',   '+^ rs.!E6<#+ i5_:E0N_-:cZL&,L~T7hIl>PP>iOF<bAg@^t-VQA/*#IfDumQhA');
define('NONCE_SALT',       ':tA}lX^NCgoUxhMkD|DCLJT--j-#j7r)g$~R}Ble?l&N9=kH|Q#d^W.cbu)w8-]Q');
require_once(ABSPATH . 'wp-settings.php');
