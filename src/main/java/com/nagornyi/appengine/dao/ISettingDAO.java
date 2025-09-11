package com.nagornyi.appengine.dao;

import com.nagornyi.appengine.entity.Setting;

public interface ISettingDAO extends DAO<Setting> {

    Setting searchByKey(String settingKey);
}
