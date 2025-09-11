package com.nagornyi.appengine.entity;

import com.google.appengine.api.datastore.Entity;

public class Setting extends EntityWrapper {


    private String settingKey;

    private String settingValue;

    public Setting() {
    }

    public Setting(Entity entity) {
        super(entity);
    }

    public String getSettingKey() {
        return getProperty("settingKey");
    }

    public void setSettingKey(String settingKey) {
        setProperty("settingKey", settingKey);
    }

    public String getSettingValue() {
        return getProperty("settingValue");
    }

    public void setSettingValue(String settingValue) {
        setProperty("settingValue", settingValue);
    }

    public static Setting newSetting(String settingKey) {
        Setting setting = new Setting();
        setting.setSettingKey(settingKey);
        return setting;
    }
 }
