package com.nagornyi.appengine.dao;

import com.google.appengine.api.datastore.Key;
import com.nagornyi.appengine.dao.app.AppEngineFactory;
import com.nagornyi.appengine.entity.BaseEntity;
import org.apache.commons.collections4.CollectionUtils;

import java.util.Collections;
import java.util.List;

/**
 * @author Nagorny
 *         Date: 12.05.14
 */
public class DAOFacade {
    private static DAOFactory factory = new AppEngineFactory();

    public static DAOFactory getFactory() {
        return factory;
    }

    public static <E extends BaseEntity, T extends DAO<E>> T getDAO(Class<E> kind) {
        return getFactory().getDAO(kind);
    }

    public static <E extends BaseEntity> Key save(E entity) {
        return ((DAO<E>)getDAO(entity.getClass())).save(entity);
    }

    public static <E extends BaseEntity> List<Key> bulkSave(List<E> entities) {
        if (CollectionUtils.isEmpty(entities)) return Collections.emptyList();
        E ent = entities.iterator().next();

        return ((DAO<E>)getDAO(ent.getClass())).save(entities);
    }

    public static <E extends BaseEntity> void bulkCreate(List<E> entities) {
        E ent = entities.iterator().next();
        if (ent == null) return;

        ((DAO<E>)getDAO(ent.getClass())).create(entities);
    }

    public static <E extends BaseEntity> void create(E entity) {
        ((DAO<E>)getDAO(entity.getClass())).create(entity);
    }

    public static <E extends BaseEntity> E findById(Class<E> kind, Key id) {
        return getDAO(kind).getById(id);
    }

    public static <E extends BaseEntity> E findByKey(Class<E> kind, Key key) {
        return getDAO(kind).getByKey(key);
    }

    public static <E extends BaseEntity> List<E> findAll(Class<E> kind) {
        return getDAO(kind).getAll();
    }

    public static <E extends BaseEntity> List<E> findByParent(Class<E> kind, Key parentKey) {
        return getDAO(kind).getByParent(parentKey);
    }

    public static <E extends BaseEntity> void delete(E entity) {
        ((DAO<E>)getDAO(entity.getClass())).delete(entity);
    }
}

