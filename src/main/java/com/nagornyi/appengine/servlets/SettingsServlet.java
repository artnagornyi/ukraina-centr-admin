package com.nagornyi.appengine.servlets;

import com.nagornyi.appengine.dto.SettingDto;
import com.nagornyi.appengine.jackson.ActionUtil;
import com.nagornyi.appengine.service.SettingsService;

import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import java.util.Map;

public class SettingsServlet extends HttpServlet {

    private final SettingsService settingsService = new SettingsService();

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {

        List<SettingDto> allSettings = settingsService.getAllSettings();

        resp.getWriter().print(ActionUtil.serializeObject(allSettings));

        resp.setStatus(HttpServletResponse.SC_OK);
        resp.setContentType("application/json");
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {

        String data = req.getParameter("data");
        SettingDto setting = ActionUtil.deserializeObject(data, SettingDto.class);
        if (setting != null) {
            settingsService.save(setting);
        }
        resp.getWriter().print(ActionUtil.serializeObject(Map.of()));
        resp.setStatus(HttpServletResponse.SC_CREATED);
        resp.setContentType("application/json");
    }
}
