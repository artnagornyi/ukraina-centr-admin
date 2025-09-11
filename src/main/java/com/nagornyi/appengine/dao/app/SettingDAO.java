package com.nagornyi.appengine.dao.app;

import com.google.appengine.api.datastore.Entity;
import com.nagornyi.appengine.dao.ISettingDAO;
import com.nagornyi.appengine.entity.Setting;

import java.util.List;

public class SettingDAO extends EntityDAO<Setting> implements ISettingDAO {
    @Override
    protected Setting createDAOEntity(Entity entity) {
        return new Setting(entity);
    }

    public Setting searchByKey(String settingKey) {
        List<Setting> listWithSettingKey = getByProperty("settingKey", settingKey);

        return listWithSettingKey.isEmpty() ? Setting.newSetting(settingKey) : listWithSettingKey.get(0);
    }

    @Override
    protected String getKind() {
        return "Setting";
    }
}
