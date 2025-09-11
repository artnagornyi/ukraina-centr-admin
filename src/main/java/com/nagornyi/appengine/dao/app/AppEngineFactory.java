package com.nagornyi.appengine.dao.app;


import com.nagornyi.appengine.dao.DAO;
import com.nagornyi.appengine.dao.DAOFactory;
import com.nagornyi.appengine.entity.Setting;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * @author Nagorny
 * Date: 12.05.14
 */
public class AppEngineFactory implements DAOFactory {

    private static Map<Class, DAO> map = new ConcurrentHashMap<Class, DAO>();

    static {
        map.put(Setting.class, new SettingDAO());
    }

    @Override
    public <T extends DAO> T getDAO(Class kind) {
        return (T)map.get(kind);
    }
}
