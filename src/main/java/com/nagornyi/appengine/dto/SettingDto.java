package com.nagornyi.appengine.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class SettingDto {
    private String settingKey;
    private String settingValue;
}
