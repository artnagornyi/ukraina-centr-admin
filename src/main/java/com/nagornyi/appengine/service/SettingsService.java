package com.nagornyi.appengine.service;

import com.nagornyi.appengine.dao.DAOFacade;
import com.nagornyi.appengine.dao.ISettingDAO;
import com.nagornyi.appengine.dto.SettingDto;
import com.nagornyi.appengine.entity.Setting;

import java.util.List;

public class SettingsService {

    private final ISettingDAO settingDAO = DAOFacade.getDAO(Setting.class);

    public List<SettingDto> getAllSettings() {
        return settingDAO.getAll().stream()
                .map(setting -> SettingDto.builder()
                        .settingKey(setting.getSettingKey())
                        .settingValue(setting.getSettingValue())
                        .build())
                .toList();
    }

    public void save(SettingDto settingDto) {
        Setting setting = new Setting();
        setting.setSettingKey(settingDto.getSettingKey());
        setting.setSettingValue(settingDto.getSettingValue());
        settingDAO.save(setting);
    }
}
