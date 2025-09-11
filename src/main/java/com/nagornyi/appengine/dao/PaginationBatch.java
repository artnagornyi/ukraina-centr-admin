package com.nagornyi.appengine.dao;

import com.nagornyi.appengine.entity.EntityWrapper;

import java.util.ArrayList;
import java.util.List;

/**
 * @author Nagornyi
 *         Date: 07.07.14
 */
public class PaginationBatch<E extends EntityWrapper> {
    private String startCursor;
    private List<E> entitiesBatch = new ArrayList<E>();

    public PaginationBatch(String startCursor) {
        this.startCursor = startCursor;
    }

    public String getStartCursor() {
        return startCursor;
    }

    public List<E> getEntitiesBatch() {
        return entitiesBatch;
    }

    public void addEntity(E entity) {
        entitiesBatch.add(entity);
    }
}
